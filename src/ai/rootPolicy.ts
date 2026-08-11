/**
 * 根节点着法策略（与 Minimax 搜索解耦）
 *
 * 紧迫阶梯（高 → 低），由 `planRootPhase` 按相位推进，避免散落 if 补丁：
 * 1. 一步胜 / 硬必防 / 己方活四 / 双胜点快路径
 * 2. 己方 VCF
 * 3. 对方活四端：已强制真双 / 四三 → 否则软挡；对方 VCF 必防
 * 4. 已强制真双；对方叉时确认 VCT 先于叉对杀
 * 5. 对方叉：强迫着 → 模式 J/I 活四续攻认序 → 冲四留叉 → 否则软搜
 * 6. 冲四/单活四留叉 → 己方 VCT → 对方 VCT 必防
 * 7. 其余软威胁 / 全盘 αβ
 */

import type { AiMove, AiPlayer } from './types'
import {
  findFourThreatMoves,
  findForkThreeMoves,
  findOpenFourMoves,
  findOpenThreeMoves,
  findWinningMoves,
  listHardForcedReplies,
  listSoftDefenseCandidates,
  listSoftRootCandidates,
  measureAttackLethality,
  pickBestForcedReply,
  scoreForcedReply,
} from './threats'
import { analyzeVcfDefense, findVcfMove, vcfExists, type VcfOptions } from './vcf'
import {
  findRushFourIntoForkMove,
  findTrueDualMove,
  findVctDefense,
  findVctMove,
  isTrueOpenFourDual,
  vctExists,
  type VctOptions,
} from './vct'
import { checkWinner } from '../core'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'

/** 根上强迫着应手探测的节点帽（控制时延） */
const FORCING_PROBE_NODES = 4_000

const NEIGHBOR_RADIUS = 2

/** 抢攻门槛：至少「双活四向」杀伤（dual≈2） */
const RACE_MIN_LETHALITY = 2_000

/** 模式 J：短强迫线 continuity 探测节点帽（找不到即视为无，控时延） */
const ATTACK_ORDER_PROBE_NODES = 3_000

function other(p: AiPlayer): AiPlayer {
  return p === 1 ? 2 : 1
}

function moveKey(m: AiMove): string {
  return `${m.row},${m.col}`
}

export type RootPhase =
  | { type: 'terminal'; move: AiMove }
  | {
      type: 'search'
      /** null = 全盘候选 */
      restrict: AiMove[] | null
      /** 软/硬防守底线；搜索结束后与之比较 */
      defenseFloor: AiMove[]
    }

export interface RootPolicyOptions {
  rules?: RuleSetId
  radius?: number
  softRootLimit?: number
  /** VCF 半步上限；0 关闭 */
  vcfMaxPly?: number
  /** VCF 节点帽；缺省用求解器默认 */
  vcfMaxNodes?: number
  shouldAbortVcf?: () => boolean
  /** VCT 半步上限；0 关闭（#70 仅唐僧开启） */
  vctMaxPly?: number
  /** VCT 节点帽；缺省用求解器默认 */
  vctMaxNodes?: number
  shouldAbortVct?: () => boolean
}

/**
 * 己方进攻点（活四 / 双杀叉 / 冲四）。
 */
export function listAttackCandidates(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const seen = new Set<string>()
  const out: AiMove[] = []
  for (const m of [
    ...findOpenFourMoves(board, toPlay, rules, radius),
    ...findForkThreeMoves(board, toPlay, rules, radius),
    ...findFourThreatMoves(board, toPlay, rules, radius),
  ]) {
    const k = moveKey(m)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(m)
  }
  return out
}

/**
 * 软威胁根候选（委托 threats.listSoftRootCandidates，单一实现）。
 */
export function buildSoftRootRestrict(
  board: number[][],
  toPlay: AiPlayer,
  _defense: AiMove[],
  limit: number,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  return listSoftRootCandidates(board, toPlay, limit, rules, radius)
}

export interface AttackContinuity {
  /** 每一必应挡后己方仍有确认 VCT（findVctMove） */
  sustainedVct: boolean
  /** 着法造成可成活四（模式 J 只抢这类续攻，不含裸冲四） */
  createsOpenFour: boolean
  /** 落在对方叉点（兼攻易转让攻势） */
  onOppFork: boolean
  /** 最差应手 continuity 分（越大越好） */
  score: number
}

/**
 * 模式 J · 短强迫线 continuity（RESULTS 攻势顺序）：
 * 试下后对每个可成活四挡点取最差应手，比较确认 VCT / 消叉 / 是否兼攻对方叉点。
 * 用于叉对杀同分择优，以及软叉下「活四续攻且挡后仍有 VCT」抢攻。
 */
export function evaluateAttackContinuity(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS,
  vctMaxPly = 14
): AttackContinuity {
  const fail: AttackContinuity = {
    sustainedVct: false,
    createsOpenFour: false,
    onOppFork: false,
    score: Number.NEGATIVE_INFINITY,
  }
  if (board[move.row]![move.col] !== 0) return fail
  const opp = other(toPlay)
  const onOppFork = findForkThreeMoves(board, opp, rules, radius).some(
    (f) => f.row === move.row && f.col === move.col
  )
  const oppForksBefore = findForkThreeMoves(board, opp, rules, radius).length

  board[move.row]![move.col] = toPlay
  if (checkWinner(board, move.row, move.col, rules) === toPlay) {
    board[move.row]![move.col] = 0
    return { sustainedVct: true, createsOpenFour: true, onOppFork, score: 100_000_000 }
  }

  const wins = findWinningMoves(board, toPlay, rules, radius)
  const openFours = findOpenFourMoves(board, toPlay, rules, radius)
  const createsOpenFour = openFours.length > 0
  const oppForksAfter = findForkThreeMoves(board, opp, rules, radius).length
  // 落在对方叉点上「消叉」不算维持己方攻势（080 i8 / 074 h9）
  const clearedOppForks = onOppFork ? 0 : Math.max(0, oppForksBefore - oppForksAfter)

  if (wins.length >= 2) {
    board[move.row]![move.col] = 0
    return {
      sustainedVct: true,
      createsOpenFour,
      onOppFork,
      score: 50_000_000 + clearedOppForks * 10_000,
    }
  }

  // 模式 J 只评估活四逼应线；裸冲四走 G/F，不在此抢软叉
  if (!createsOpenFour) {
    board[move.row]![move.col] = 0
    return {
      sustainedVct: false,
      createsOpenFour: false,
      onOppFork,
      score: Number.NEGATIVE_INFINITY,
    }
  }

  const vctOpts: VctOptions = {
    maxPly: vctMaxPly,
    rules,
    radius,
    maxNodes: ATTACK_ORDER_PROBE_NODES,
  }

  let worst = Number.POSITIVE_INFINITY
  let sustainedVct = true
  for (const d of openFours) {
    if (board[d.row]![d.col] !== 0) continue
    board[d.row]![d.col] = opp
    const myForks = findForkThreeMoves(board, toPlay, rules, radius).length
    const oppForks = findForkThreeMoves(board, opp, rules, radius).length
    // 挡后须仍有叉/活四才值得探 VCT；裸冲四残留太常见，负搜极贵（dual-OF 回归 k5）
    const hasShape = myForks > 0 || findOpenFourMoves(board, toPlay, rules, radius).length > 0
    const selfVct = hasShape ? findVctMove(board, toPlay, vctOpts) !== null : false
    if (!selfVct) sustainedVct = false
    const oppVct = selfVct ? findVctMove(board, opp, vctOpts) !== null : false
    const score =
      (oppVct ? 0 : 5_000_000) +
      (selfVct ? 1_000_000 : 0) +
      clearedOppForks * 2_000_000 +
      myForks * 1_000 -
      oppForks * 2_000 -
      (onOppFork ? 300_000 : 0)
    if (score < worst) worst = score
    board[d.row]![d.col] = 0
  }
  board[move.row]![move.col] = 0
  return {
    sustainedVct,
    createsOpenFour,
    onOppFork,
    score: Number.isFinite(worst) ? worst : Number.NEGATIVE_INFINITY,
  }
}

/** continuity 分值快捷接口 */
export function scoreAttackContinuity(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS,
  vctMaxPly = 14
): number {
  return evaluateAttackContinuity(board, toPlay, move, rules, radius, vctMaxPly).score
}

/**
 * 叉对杀同分用的轻量顺序分：只看消叉 / 兼攻 / 挡后残留形，不跑 VCT。
 */
function scoreAttackOrderLight(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  rules: RuleSetId,
  radius: number
): number {
  if (board[move.row]![move.col] !== 0) return Number.NEGATIVE_INFINITY
  const opp = other(toPlay)
  const onOppFork = findForkThreeMoves(board, opp, rules, radius).some(
    (f) => f.row === move.row && f.col === move.col
  )
  const oppForksBefore = findForkThreeMoves(board, opp, rules, radius).length

  board[move.row]![move.col] = toPlay
  const openFours = findOpenFourMoves(board, toPlay, rules, radius)
  const oppForksAfter = findForkThreeMoves(board, opp, rules, radius).length
  const clearedOppForks = onOppFork ? 0 : Math.max(0, oppForksBefore - oppForksAfter)

  if (openFours.length === 0) {
    board[move.row]![move.col] = 0
    return Number.NEGATIVE_INFINITY
  }

  let worst = Number.POSITIVE_INFINITY
  for (const d of openFours) {
    if (board[d.row]![d.col] !== 0) continue
    board[d.row]![d.col] = opp
    const myForks = findForkThreeMoves(board, toPlay, rules, radius).length
    const myOF = findOpenFourMoves(board, toPlay, rules, radius).length
    const myFour = findFourThreatMoves(board, toPlay, rules, radius).length
    const oppForks = findForkThreeMoves(board, opp, rules, radius).length
    const score =
      clearedOppForks * 2_000_000 +
      (myForks + myOF + myFour > 0 ? 100_000 : 0) +
      myForks * 1_000 -
      oppForks * 2_000 -
      (onOppFork ? 300_000 : 0)
    if (score < worst) worst = score
    board[d.row]![d.col] = 0
  }
  board[move.row]![move.col] = 0
  return Number.isFinite(worst) ? worst : Number.NEGATIVE_INFINITY
}

/**
 * 模式 J/I：活四续攻候选（叉 + 能成活四的活三软起手 + 冲四/单活四留叉）。
 */
function collectAttackOrderCandidates(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId,
  radius: number
): AiMove[] {
  const rush = findRushFourIntoForkMove(board, toPlay, { rules, radius })
  const softSeeds: AiMove[] = []
  for (const m of findOpenThreeMoves(board, toPlay, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = toPlay
    const of = findOpenFourMoves(board, toPlay, rules, radius).length
    board[m.row]![m.col] = 0
    if (of > 0) softSeeds.push(m)
    if (softSeeds.length >= 16) break
  }
  return uniqueCandidateMoves([
    ...findForkThreeMoves(board, toPlay, rules, radius),
    ...softSeeds,
    ...(rush ? [rush] : []),
  ])
}

/**
 * 模式 I 认序分（RESULTS 软起手短 VCT）：
 * 少把活四端搭在对方叉上；无搭叉时偏好双活四向；有搭叉时偏好单活四软起手；
 * 冲四留叉贪残留降权（072 g9）；兼攻对方叉的双苗降权。
 */
function rankSoftAttackOrder(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  ev: AttackContinuity,
  rush: AiMove | null,
  rules: RuleSetId,
  radius: number
): number {
  if (!ev.createsOpenFour) return Number.NEGATIVE_INFINITY
  const opp = other(toPlay)
  const oppForkKeys = new Set(findForkThreeMoves(board, opp, rules, radius).map((f) => moveKey(f)))
  board[move.row]![move.col] = toPlay
  const openFours = findOpenFourMoves(board, toPlay, rules, radius)
  const ofOnOpp = openFours.filter((f) => oppForkKeys.has(moveKey(f))).length
  const ofCount = openFours.length
  const trueDual = ofCount >= 2 && isTrueOpenFourDual(board, toPlay, openFours, rules, radius)
  board[move.row]![move.col] = 0
  // 真双活四可认序；其余须挡后仍有确认 VCT
  if (!ev.sustainedVct && !trueDual) return Number.NEGATIVE_INFINITY

  const isRush = !!(rush && rush.row === move.row && rush.col === move.col)
  return (
    (trueDual ? 100_000_000 : 0) -
    ofOnOpp * 10_000_000 -
    (ev.onOppFork && ofCount >= 2 ? 3_000_000 : 0) +
    (ofOnOpp === 0 ? ofCount * 2_000_000 : (4 - ofCount) * 2_000_000) -
    (isRush && ofCount === 1 ? 1_500_000 : 0) +
    Math.min(Number.isFinite(ev.score) ? ev.score : 0, 999_999)
  )
}

/**
 * 可成活四真双（挡任一端仍有杀/活四）。可压过对方软叉（081–085），
 * 与「胜点≥2」的已强制真双互补。
 */
function pickTrueOpenFourDualMove(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId,
  radius: number
): AiMove | null {
  const seeds = uniqueCandidateMoves([
    ...findForkThreeMoves(board, toPlay, rules, radius),
    ...findOpenThreeMoves(board, toPlay, rules, radius).slice(0, 24),
  ])
  let best: AiMove | null = null
  let bestExtra = -1
  for (const m of seeds) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = toPlay
    if (checkWinner(board, m.row, m.col, rules) === toPlay) {
      board[m.row]![m.col] = 0
      return m
    }
    const ofs = findOpenFourMoves(board, toPlay, rules, radius)
    const ok = ofs.length >= 2 && isTrueOpenFourDual(board, toPlay, ofs, rules, radius)
    const forks = findForkThreeMoves(board, toPlay, rules, radius).length
    board[m.row]![m.col] = 0
    if (!ok) continue
    const extra = ofs.length * 10 + forks
    if (extra > bestExtra) {
      bestExtra = extra
      best = m
    }
  }
  return best
}

/**
 * 对方软叉下：活四续攻且挡后仍有确认 VCT；模式 I 按认序分择优（072/075/077/078/068）。
 */
function pickAttackOrderMove(
  board: number[][],
  toPlay: AiPlayer,
  candidates: AiMove[],
  rules: RuleSetId,
  radius: number,
  vctMaxPly: number
): AiMove | null {
  const rush = findRushFourIntoForkMove(board, toPlay, { rules, radius })
  let best: AiMove | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const m of uniqueCandidateMoves(candidates)) {
    if (board[m.row]![m.col] !== 0) continue
    const ev = evaluateAttackContinuity(board, toPlay, m, rules, radius, vctMaxPly)
    const score = rankSoftAttackOrder(board, toPlay, m, ev, rush, rules, radius)
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

/**
 * 双方有叉、盘上尚无「可成活四」时：仅当己方最强叉**严格强于**对方时抢攻。
 * 杀伤持平则先挡（持平抢攻会放过对方叉，见 03-19-46）。
 * 假双挡后无残留不当杀伤（academy 050 g9）。
 * 杀伤同分时按模式 J continuity 择优（071 i9 先于后手 h10）。
 */
export function pickForkRaceMove(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove | null {
  const opp = other(toPlay)
  if (findOpenFourMoves(board, opp, rules, radius).length > 0) return null

  const oppForks = findForkThreeMoves(board, opp, rules, radius)
  const myForks = findForkThreeMoves(board, toPlay, rules, radius)
  if (oppForks.length === 0 || myForks.length === 0) return null

  const lethality = (side: AiPlayer, f: AiMove): number => {
    const L = measureAttackLethality(board, side, f, rules, radius)
    if (!Number.isFinite(L) || L < RACE_MIN_LETHALITY) return L
    if (board[f.row]![f.col] !== 0) return Number.NEGATIVE_INFINITY
    board[f.row]![f.col] = side
    const ofs = findOpenFourMoves(board, side, rules, radius)
    if (ofs.length >= 2 && !isTrueOpenFourDual(board, side, ofs, rules, radius)) {
      const enemy = other(side)
      const d = ofs[0]!
      if (board[d.row]![d.col] === 0) {
        board[d.row]![d.col] = enemy
        const residual =
          findForkThreeMoves(board, side, rules, radius).length +
          findOpenFourMoves(board, side, rules, radius).length
        board[d.row]![d.col] = 0
        board[f.row]![f.col] = 0
        return residual === 0 ? 0 : L
      }
    }
    board[f.row]![f.col] = 0
    return L
  }

  let bestOwnL = Number.NEGATIVE_INFINITY
  const topForks: AiMove[] = []
  for (const f of myForks) {
    const L = lethality(toPlay, f)
    if (L > bestOwnL) {
      bestOwnL = L
      topForks.length = 0
      topForks.push(f)
    } else if (L === bestOwnL && L >= RACE_MIN_LETHALITY) {
      topForks.push(f)
    }
  }
  if (topForks.length === 0 || bestOwnL < RACE_MIN_LETHALITY) return null

  let bestOppL = Number.NEGATIVE_INFINITY
  for (const f of oppForks) {
    const L = lethality(opp, f)
    if (L > bestOppL) bestOppL = L
  }

  if (bestOwnL <= bestOppL) return null
  if (topForks.length === 1) return topForks[0]!

  // 模式 J：仅「活四续攻」叉才按轻量 continuity 重排（不做 VCT 探测，控时延）
  const ofForks: AiMove[] = []
  for (const m of topForks) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = toPlay
    const of = findOpenFourMoves(board, toPlay, rules, radius).length > 0
    board[m.row]![m.col] = 0
    if (of) ofForks.push(m)
  }
  if (ofForks.length === 0) return topForks[0]!

  let best: AiMove = ofForks[0]!
  let bestScore = scoreAttackOrderLight(board, toPlay, best, rules, radius)
  for (let i = 1; i < ofForks.length; i++) {
    const m = ofForks[i]!
    const score = scoreAttackOrderLight(board, toPlay, m, rules, radius)
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

/**
 * 搜索着 vs 防守底线。
 * - 活三未消 → 必须守
 * - 已造成双活四且对方无活三、无叉 → 允许越出底线抢攻
 * - 其余不得比防守底线更差；同档偏兼攻（由 scoreForcedReply 体现）
 */
export function resolveSearchWithDefenseFloor(
  board: number[][],
  toPlay: AiPlayer,
  searchMove: AiMove | null,
  defenseFloor: AiMove[],
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove | null {
  const floor =
    defenseFloor.length > 0
      ? (pickBestForcedReply(board, toPlay, defenseFloor, rules, radius) ?? defenseFloor[0]!)
      : null

  if (!searchMove) return floor
  if (!floor) return searchMove

  const inFloor = defenseFloor.some((m) => m.row === searchMove.row && m.col === searchMove.col)
  const searchScore = scoreForcedReply(board, toPlay, searchMove, rules, radius)
  const floorScore = scoreForcedReply(board, toPlay, floor, rules, radius)

  if (!inFloor) {
    board[searchMove.row]![searchMove.col] = toPlay
    const opp = other(toPlay)
    const stillWin = findWinningMoves(board, opp, rules, radius).length
    const stillOF = findOpenFourMoves(board, opp, rules, radius).length
    const stillFork = findForkThreeMoves(board, opp, rules, radius).length
    const myOF = findOpenFourMoves(board, toPlay, rules, radius).length
    const myWinThreats = findWinningMoves(board, toPlay, rules, radius).length
    board[searchMove.row]![searchMove.col] = 0

    if (stillWin > 0) return floor
    // 己方冲四/活四胜点：对方必须应一手，可压过「挡叉」底线抢先手
    if (myWinThreats > 0) return searchMove
    // 双活四抢攻仅当对方已无活三/叉可兑（假双须对方无叉）
    if (myOF >= 2 && stillOF === 0 && stillFork === 0) return searchMove
    if (stillOF > 0 || stillFork > 0) return floor
  }

  if (searchScore > floorScore) return floor
  return searchMove
}

function terminal(move: AiMove): RootPhase {
  return { type: 'terminal', move }
}

function softSearch(
  board: number[][],
  toPlay: AiPlayer,
  defense: AiMove[],
  softRootLimit: number,
  rules: RuleSetId,
  radius: number
): RootPhase {
  return {
    type: 'search',
    restrict: listSoftRootCandidates(board, toPlay, softRootLimit, rules, radius),
    defenseFloor: defense,
  }
}

/** 一手造成双胜点（或直接胜） */
function pickQuickDualWin(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId,
  radius: number
): AiMove | null {
  const quick = findFourThreatMoves(board, toPlay, rules, radius)
  for (const m of quick) {
    board[m.row]![m.col] = toPlay
    const wins = findWinningMoves(board, toPlay, rules, radius).length
    const won = checkWinner(board, m.row, m.col, rules) === toPlay
    board[m.row]![m.col] = 0
    if (won || wins >= 2) return m
  }
  return null
}

/**
 * 强迫着试下后的局面摘要（含对方唯一胜点应手）。
 * 用于比较「冲四抢先 vs 己方 VCT」：禁止只看一手打断、不看应手后谁还有杀。
 */
export interface ForcingOutcome {
  immediateWin: boolean
  forceWins: number
  openFourCount: number
  trueDual: boolean
  fourThree: boolean
  /** 落点本身是否兼攻对方叉（四三抢攻豁免破 VCF 项时用，070 g9） */
  onOppFork: boolean
  residualForks: number
  residualOpenFours: number
  /**
   * 应手后：在「落下可成 ≥2 活四」的残留叉上，叉丰度最大值。
   * 用于同分冲四择优（060 d10 的 e10 续攻优于 f12/c9）。
   */
  residualDualSeedForks: number
  /** 应手后对方活四数：旁路冲四惩罚（046 j11 / 058 d10） */
  oppOpenFours: number
  oppVct: boolean
  oppVcf: boolean
  selfVct: boolean
  selfVcf: boolean
}

/** 探测专用选项：只用节点帽，不继承根上 shouldAbort（超时会把 VCT 误判成无） */
function probeOpts(vctOpts: VctOptions, vcfOpts: VcfOptions): { vct: VctOptions; vcf: VcfOptions } {
  return {
    vct: {
      maxPly: vctOpts.maxPly,
      rules: vctOpts.rules,
      radius: vctOpts.radius,
      maxNodes: FORCING_PROBE_NODES,
    },
    vcf: {
      maxPly: vcfOpts.maxPly,
      rules: vcfOpts.rules,
      radius: vcfOpts.radius,
      maxNodes: FORCING_PROBE_NODES,
    },
  }
}

/**
 * 试下 `move` 后（若仅一胜点则替对方挡上）测量双方杀棋残留。
 */
export function inspectForcingOutcome(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  vctOpts: VctOptions = {},
  vcfOpts: VcfOptions = {},
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): ForcingOutcome | null {
  if (board[move.row]![move.col] !== 0) return null
  const opp = other(toPlay)
  const { vct: vctO, vcf: vcfO } = probeOpts(vctOpts, vcfOpts)
  const onOppFork = findForkThreeMoves(board, opp, rules, radius).some(
    (f) => f.row === move.row && f.col === move.col
  )

  board[move.row]![move.col] = toPlay
  if (checkWinner(board, move.row, move.col, rules) === toPlay) {
    board[move.row]![move.col] = 0
    return {
      immediateWin: true,
      forceWins: 0,
      openFourCount: 0,
      trueDual: false,
      fourThree: false,
      onOppFork,
      residualForks: 0,
      residualOpenFours: 0,
      residualDualSeedForks: 0,
      oppOpenFours: 0,
      oppVct: false,
      oppVcf: false,
      selfVct: true,
      selfVcf: true,
    }
  }

  const wins = findWinningMoves(board, toPlay, rules, radius)
  const forceWins = wins.length
  const openFours = findOpenFourMoves(board, toPlay, rules, radius)
  const openFourCount = openFours.length
  // 已强制：胜点 ≥2；可成活四双苗不算 trueDual（§3.2）
  const trueDual = forceWins >= 2
  const fourThree = forceWins >= 1 && openFours.length >= 1

  if (forceWins >= 2 || trueDual) {
    board[move.row]![move.col] = 0
    return {
      immediateWin: false,
      forceWins: Math.max(forceWins, trueDual ? 2 : forceWins),
      openFourCount,
      trueDual,
      fourThree,
      onOppFork,
      residualForks: 0,
      residualOpenFours: 0,
      residualDualSeedForks: 0,
      oppOpenFours: 0,
      oppVct: false,
      oppVcf: false,
      selfVct: true,
      selfVcf: true,
    }
  }

  let block: AiMove | null = null
  if (forceWins === 1) block = wins[0]!
  else if (openFours.length === 1) block = openFours[0]!

  if (block) {
    if (board[block.row]![block.col] !== 0) {
      board[move.row]![move.col] = 0
      return null
    }
    board[block.row]![block.col] = opp
  }

  const residualForks = findForkThreeMoves(board, toPlay, rules, radius).length
  const residualOpenFours = findOpenFourMoves(board, toPlay, rules, radius).length
  let residualDualSeedForks = 0
  for (const f of findForkThreeMoves(board, toPlay, rules, radius)) {
    if (board[f.row]![f.col] !== 0) continue
    board[f.row]![f.col] = toPlay
    const ofCount = findOpenFourMoves(board, toPlay, rules, radius).length
    const forksAfter = findForkThreeMoves(board, toPlay, rules, radius).length
    board[f.row]![f.col] = 0
    if (ofCount >= 2 && forksAfter > residualDualSeedForks) {
      residualDualSeedForks = forksAfter
    }
  }
  const oppOpenFours = findOpenFourMoves(board, opp, rules, radius).length
  const oppVcf = vcfExists(board, opp, opp, vcfO)
  const oppVct = oppVcf || vctExists(board, opp, opp, vctO)
  const selfVcf = vcfExists(board, toPlay, toPlay, vcfO)
  const selfVct = selfVcf || vctExists(board, toPlay, toPlay, vctO)

  if (block) board[block.row]![block.col] = 0
  board[move.row]![move.col] = 0

  return {
    immediateWin: false,
    forceWins,
    openFourCount,
    trueDual,
    fourThree,
    onOppFork,
    residualForks,
    residualOpenFours,
    residualDualSeedForks,
    oppOpenFours,
    oppVct,
    oppVcf,
    selfVct,
    selfVcf,
  }
}

/**
 * 强迫着得分（越大越好）。
 * 主序：立刻胜 / 双胜点 → 应手后对方无 VCT → 己方仍有 VCT → 破对方 VCF /
 * 四三兼攻豁免 → 双活四向续攻丰度 → 硬残留；非四三却留对方活四则重罚。
 */
export function scoreForcingOutcome(o: ForcingOutcome): number {
  if (o.immediateWin) return 1_000_000_000
  if (o.forceWins >= 2 || o.trueDual) return 100_000_000
  const residual = o.residualForks + o.residualOpenFours
  const emptyRushPenalty =
    o.forceWins === 1 && o.openFourCount === 0 && residual === 0 ? -5_000_000 : 0
  // 070 g9：四三落在对方叉上，可与「破 VCF」同档；060 j8 裸四三不豁免
  const breaksOppVcf = !o.oppVcf || (o.fourThree && o.onOppFork)
  // 046 j11 / 058 d10：旁路冲四应手后送给对方活四
  const oppOfPenalty = !o.fourThree && o.oppOpenFours > 0 ? o.oppOpenFours * 2_000_000 : 0
  return (
    (o.oppVct ? 0 : 10_000_000) +
    (o.selfVct ? 1_000_000 : 0) +
    (breaksOppVcf ? 100_000 : 0) +
    (o.selfVcf ? 10_000 : 0) +
    emptyRushPenalty +
    (o.fourThree ? 5_000 : 0) +
    o.residualDualSeedForks * 1_000 +
    residual * 300 +
    o.forceWins * 100 -
    oppOfPenalty
  )
}

/** 应手后「对方有 VCT 而己方没有」——假抢先，直接丢弃 */
function isSuicidalForcing(o: ForcingOutcome): boolean {
  if (o.immediateWin || o.forceWins >= 2 || o.trueDual) return false
  return o.oppVct && !o.selfVct
}

/**
 * 可否压过对方软活四/软叉抢攻（契约 · RESULTS 模式 G）：
 * - 立刻胜 / 已强制双威胁 / 四三且应后对方无 VCT
 * - 或纯节奏冲四（挡后无叉/活四残留；回归 10-17-10）
 * 挡后仅「留叉」的裸冲四不得短路（048 g6 / 076 e9）。
 */
function canRaceSoftDefense(o: ForcingOutcome): boolean {
  if (o.immediateWin || o.trueDual || o.forceWins >= 2) return true
  if (o.fourThree && !o.oppVct && !isSuicidalForcing(o)) return true
  const residual = o.residualForks + o.residualOpenFours
  // 纯节奏冲四（挡后无叉/活四残留）；对方已有 VCT 时由调用方先必防
  if (o.forceWins === 1 && o.openFourCount === 0 && residual === 0) return true
  return false
}

/** 模式 F：杀棋首着与强迫着都成立时，硬残留分更高者优先 */
function preferBetterForcing(
  board: number[][],
  toPlay: AiPlayer,
  killMove: AiMove,
  vctOpts: VctOptions,
  vcfOpts: VcfOptions,
  rules: RuleSetId,
  radius: number
): AiMove {
  const forcing = [
    ...findFourThreatMoves(board, toPlay, rules, radius),
    ...findForkThreeMoves(board, toPlay, rules, radius),
  ]
  const bestForce = pickBestForcingMove(board, toPlay, forcing, vctOpts, vcfOpts, rules, radius)
  if (!bestForce) return killMove
  const oKill = inspectForcingOutcome(board, toPlay, killMove, vctOpts, vcfOpts, rules, radius)
  const oForce = inspectForcingOutcome(board, toPlay, bestForce, vctOpts, vcfOpts, rules, radius)
  if (
    oKill &&
    oForce &&
    scoreForcingOutcome(oForce) > scoreForcingOutcome(oKill) &&
    (oForce.immediateWin || oForce.forceWins >= 1 || oForce.trueDual || oForce.fourThree)
  ) {
    return bestForce
  }
  return killMove
}

function uniqueCandidateMoves(moves: AiMove[]): AiMove[] {
  const seen = new Set<string>()
  const out: AiMove[] = []
  for (const m of moves) {
    const k = moveKey(m)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(m)
  }
  return out
}

/**
 * 在强迫候选中按应手后局面择优。
 * - 只考虑真正造成必应（胜点≥1）的着，避免「假 VCT 叉」压过软挡
 * - 若存在非假抢先着，只在其中选；否则在冲四里仍选相对最好的（不能全弃去软挡）
 */
export function pickBestForcingMove(
  board: number[][],
  toPlay: AiPlayer,
  candidates: AiMove[],
  vctOpts: VctOptions = {},
  vcfOpts: VcfOptions = {},
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove | null {
  type Row = { move: AiMove; outcome: ForcingOutcome; score: number }
  const scored: Row[] = []
  for (const m of uniqueCandidateMoves(candidates)) {
    if (board[m.row]![m.col] !== 0) continue
    const outcome = inspectForcingOutcome(board, toPlay, m, vctOpts, vcfOpts, rules, radius)
    if (!outcome) continue
    // 真双 / 冲四必应 / 四三 均可作为强迫候选
    if (!outcome.immediateWin && outcome.forceWins < 1 && !outcome.trueDual && !outcome.fourThree) {
      continue
    }
    scored.push({ move: m, outcome, score: scoreForcingOutcome(outcome) })
  }
  if (scored.length === 0) return null

  const safe = scored.filter((s) => !isSuicidalForcing(s.outcome))
  const pool = safe.length > 0 ? safe : scored
  let best: Row | null = null
  for (const row of pool) {
    if (!best || row.score > best.score) best = row
  }
  return best?.move ?? null
}

/**
 * 根节点相位：短路着法，或「受限/全盘搜索 + 防守底线」。
 */
export function planRootPhase(
  board: number[][],
  toPlay: AiPlayer,
  options: RootPolicyOptions = {}
): RootPhase {
  const rules = options.rules ?? DEFAULT_RULE_SET
  const radius = options.radius ?? NEIGHBOR_RADIUS
  const softRootLimit = options.softRootLimit ?? 16
  const vcfMaxPly = options.vcfMaxPly ?? 0
  const vctMaxPly = options.vctMaxPly ?? 0
  const opp = other(toPlay)
  const vcfOpts: VcfOptions = {
    maxPly: vcfMaxPly,
    rules,
    radius,
    shouldAbort: options.shouldAbortVcf,
    maxNodes: options.vcfMaxNodes,
  }
  const vctOpts: VctOptions = {
    maxPly: vctMaxPly,
    rules,
    radius,
    shouldAbort: options.shouldAbortVct,
    maxNodes: options.vctMaxNodes,
  }

  // —— 1. 瞬时胜负与硬形 ——
  const instant = findWinningMoves(board, toPlay, rules, radius)
  if (instant.length > 0) {
    return terminal(instant[Math.floor(Math.random() * instant.length)]!)
  }

  const hard = listHardForcedReplies(board, toPlay, rules, radius)
  if (hard.length > 0) {
    return terminal(pickBestForcedReply(board, toPlay, hard, rules, radius) ?? hard[0]!)
  }

  const myOpenFours = findOpenFourMoves(board, toPlay, rules, radius)
  if (myOpenFours.length > 0) {
    return terminal(myOpenFours[Math.floor(Math.random() * myOpenFours.length)]!)
  }

  if (vcfMaxPly > 0 || vctMaxPly > 0) {
    const dual = pickQuickDualWin(board, toPlay, rules, radius)
    if (dual) return terminal(dual)
  }

  // —— 2. 己方 VCF（冲四强迫）；有软威胁时与强迫着比硬残留（模式 F · 046）——
  if (vcfMaxPly > 0) {
    const myVcf = findVcfMove(board, toPlay, vcfOpts)
    if (myVcf) {
      const softThreat =
        listSoftDefenseCandidates(board, toPlay, rules, radius).length > 0 ||
        findForkThreeMoves(board, opp, rules, radius).length > 0
      if (softThreat) {
        return terminal(preferBetterForcing(board, toPlay, myVcf, vctOpts, vcfOpts, rules, radius))
      }
      return terminal(myVcf)
    }
  }

  // —— 3. 对方活三/可成活四威胁：先试己方真双/强迫杀，再挡（academy 057）——
  const defense = listSoftDefenseCandidates(board, toPlay, rules, radius)
  const oppOpenFour = findOpenFourMoves(board, opp, rules, radius)
  const oppForks = findForkThreeMoves(board, opp, rules, radius)

  if (oppOpenFour.length > 0) {
    const dual = findTrueDualMove(board, toPlay, { rules, radius })
    if (dual) return terminal(dual)
    const forceCands = [
      ...findFourThreatMoves(board, toPlay, rules, radius),
      ...findForkThreeMoves(board, toPlay, rules, radius),
    ]
    const bestForce = pickBestForcingMove(
      board,
      toPlay,
      forceCands,
      vctOpts,
      vcfOpts,
      rules,
      radius
    )
    if (bestForce) {
      const o = inspectForcingOutcome(board, toPlay, bestForce, vctOpts, vcfOpts, rules, radius)
      // 抢过软活四须真双/双胜，或四三且应手后对方无 VCT（避假四三抢攻，回归 09-00-46）
      if (o && canRaceSoftDefense(o)) {
        // 节奏冲四不得压过对方已可证 VCT / 待破 VCF
        if (o.forceWins === 1 && o.openFourCount === 0) {
          if (vctMaxPly > 0) {
            const vctBlocks = findVctDefense(board, toPlay, {
              ...vctOpts,
              maxNodes: Math.min(20_000, options.vctMaxNodes ?? 20_000),
            })
            if (vctBlocks.length > 0) {
              return terminal(
                pickBestForcedReply(board, toPlay, vctBlocks, rules, radius) ?? vctBlocks[0]!
              )
            }
          }
          if (vcfMaxPly > 0) {
            const analysis = analyzeVcfDefense(board, toPlay, vcfOpts)
            if (analysis.status === 'broken') {
              const move =
                pickBestForcedReply(board, toPlay, analysis.blocks, rules, radius) ??
                analysis.blocks[0]!
              return terminal(move)
            }
          }
        }
        return terminal(bestForce)
      }
    }
    const move = pickBestForcedReply(board, toPlay, defense, rules, radius) ?? defense[0]!
    return terminal(move)
  }

  if (vcfMaxPly > 0 && findFourThreatMoves(board, opp, rules, radius).length > 0) {
    const analysis = analyzeVcfDefense(board, toPlay, vcfOpts)
    if (analysis.status === 'broken') {
      const move =
        pickBestForcedReply(board, toPlay, analysis.blocks, rules, radius) ?? analysis.blocks[0]!
      return terminal(move)
    }
  }

  // —— 4. 已强制真双；可成活四真双；对方有叉时：模式 I 软起手 ↔ 确认 VCT → 叉对杀 ——
  {
    const dual = findTrueDualMove(board, toPlay, { rules, radius })
    if (dual) return terminal(dual)
  }
  {
    // 081–085：可成活四真双不依赖 VCT 时限，避免超时掉成假软续攻
    const ofDual = pickTrueOpenFourDualMove(board, toPlay, rules, radius)
    if (ofDual) return terminal(ofDual)
  }
  if (oppForks.length > 0 && vctMaxPly > 0) {
    const orderCands = collectAttackOrderCandidates(board, toPlay, rules, radius)
    const softOrdered = pickAttackOrderMove(board, toPlay, orderCands, rules, radius, vctMaxPly)
    const myVct = findVctMove(board, toPlay, vctOpts)
    if (softOrdered && myVct) {
      const rush = findRushFourIntoForkMove(board, toPlay, { rules, radius })
      const softEv = evaluateAttackContinuity(board, toPlay, softOrdered, rules, radius, vctMaxPly)
      const vctEv = evaluateAttackContinuity(board, toPlay, myVct, rules, radius, vctMaxPly)
      const softRank = rankSoftAttackOrder(board, toPlay, softOrdered, softEv, rush, rules, radius)
      const vctRank = rankSoftAttackOrder(board, toPlay, myVct, vctEv, rush, rules, radius)
      // 模式 I：软起手认序分高于 VCT 首着时优先（068 g5）
      if (softRank > vctRank) return terminal(softOrdered)
      return terminal(preferBetterForcing(board, toPlay, myVct, vctOpts, vcfOpts, rules, radius))
    }
    if (myVct) {
      return terminal(preferBetterForcing(board, toPlay, myVct, vctOpts, vcfOpts, rules, radius))
    }
    // 无 VCT 时不在此短路软起手，留给叉对杀 / §5（避免 071 先手 h10 压过 race i9）
  }
  const race = pickForkRaceMove(board, toPlay, rules, radius)
  if (race) return terminal(race)

  // —— 5. 对方叉：硬强迫 → 模式 J/I 攻势顺序 → 冲四留叉（须硬残留）→ 软搜 ——
  if (oppForks.length > 0 && defense.length > 0) {
    const forcing = [
      ...findFourThreatMoves(board, toPlay, rules, radius),
      ...findForkThreeMoves(board, toPlay, rules, radius),
    ]
    const bestForce = pickBestForcingMove(board, toPlay, forcing, vctOpts, vcfOpts, rules, radius)
    if (bestForce) {
      const o = inspectForcingOutcome(board, toPlay, bestForce, vctOpts, vcfOpts, rules, radius)
      if (o && canRaceSoftDefense(o)) return terminal(bestForce)
    }
    {
      const rush = findRushFourIntoForkMove(board, toPlay, { rules, radius })
      if (vctMaxPly > 0) {
        const ordered = pickAttackOrderMove(
          board,
          toPlay,
          collectAttackOrderCandidates(board, toPlay, rules, radius),
          rules,
          radius,
          vctMaxPly
        )
        if (ordered) return terminal(ordered)
      }
      if (rush && board[rush.row]![rush.col] === 0) {
        board[rush.row]![rush.col] = toPlay
        const myWins = findWinningMoves(board, toPlay, rules, radius).length
        const myOF = findOpenFourMoves(board, toPlay, rules, radius)
        const fourThree = myWins >= 1 && myOF.length >= 1
        board[rush.row]![rush.col] = 0
        if (myWins >= 2 || fourThree) return terminal(rush)
      }
    }
    return softSearch(board, toPlay, defense, softRootLimit, rules, radius)
  }

  // —— 6. 无对方活四/叉时：真双 → 冲四留叉 → 己方 VCT → 对方 VCT 必防 ——
  {
    const dual = findTrueDualMove(board, toPlay, { rules, radius })
    if (dual) return terminal(dual)
  }
  {
    const rush = findRushFourIntoForkMove(board, toPlay, { rules, radius })
    if (rush) return terminal(rush)
  }
  if (vctMaxPly > 0) {
    const myVct = findVctMove(board, toPlay, vctOpts)
    if (myVct) return terminal(myVct)
  }
  if (vctMaxPly > 0) {
    const vctBlocks = findVctDefense(board, toPlay, vctOpts)
    if (vctBlocks.length > 0) {
      return terminal(pickBestForcedReply(board, toPlay, vctBlocks, rules, radius) ?? vctBlocks[0]!)
    }
  }

  if (defense.length > 0) {
    return softSearch(board, toPlay, defense, softRootLimit, rules, radius)
  }

  return { type: 'search', restrict: null, defenseFloor: [] }
}
