/**
 * 根节点着法策略（与 Minimax 搜索解耦）
 *
 * 紧迫阶梯（高 → 低），由 `planRootPhase` 按相位推进，避免散落 if 补丁：
 * 1. 一步胜 / 硬必防 / 己方活四 / 双胜点快路径
 * 2. 己方 VCF
 * 3. 对方活四端：已强制真双 / 四三 → 否则软挡；对方 VCF 必防
 * 4. 已强制真双；对方叉时确认 VCT 先于叉对杀
 * 5. 对方叉：统一强迫着 → 冲四留叉 → 否则软搜
 * 6. 冲四/单活四留叉 → 己方 VCT → 对方 VCT 必防
 * 7. 其余软威胁 / 全盘 αβ
 */

import type { AiMove, AiPlayer } from './types'
import {
  findFourThreatMoves,
  findForkThreeMoves,
  findOpenFourMoves,
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

/**
 * 双方有叉、盘上尚无「可成活四」时：仅当己方最强叉**严格强于**对方时抢攻。
 * 杀伤持平则先挡（持平抢攻会放过对方叉，见 03-19-46）。
 * 假双挡后无残留不当杀伤（academy 050 g9）。
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

  let bestOwn: AiMove | null = null
  let bestOwnL = Number.NEGATIVE_INFINITY
  for (const f of myForks) {
    const L = lethality(toPlay, f)
    if (L > bestOwnL) {
      bestOwnL = L
      bestOwn = f
    }
  }
  if (!bestOwn || bestOwnL < RACE_MIN_LETHALITY) return null

  let bestOppL = Number.NEGATIVE_INFINITY
  for (const f of oppForks) {
    const L = lethality(opp, f)
    if (L > bestOppL) bestOppL = L
  }

  if (bestOwnL > bestOppL) return bestOwn
  return null
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
  residualForks: number
  residualOpenFours: number
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

  board[move.row]![move.col] = toPlay
  if (checkWinner(board, move.row, move.col, rules) === toPlay) {
    board[move.row]![move.col] = 0
    return {
      immediateWin: true,
      forceWins: 0,
      openFourCount: 0,
      trueDual: false,
      fourThree: false,
      residualForks: 0,
      residualOpenFours: 0,
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
      residualForks: 0,
      residualOpenFours: 0,
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
    residualForks,
    residualOpenFours,
    oppVct,
    oppVcf,
    selfVct,
    selfVcf,
  }
}

/**
 * 强迫着得分（越大越好）。
 * 主序：立刻胜 / 双胜点 → 应手后对方无 VCT → 己方仍有 VCT → 破对方 VCF / 留己方 VCF。
 */
export function scoreForcingOutcome(o: ForcingOutcome): number {
  if (o.immediateWin) return 1_000_000_000
  if (o.forceWins >= 2 || o.trueDual) return 100_000_000
  const residual = o.residualForks + o.residualOpenFours
  const emptyRushPenalty =
    o.forceWins === 1 && o.openFourCount === 0 && residual === 0 ? -5_000_000 : 0
  return (
    (o.oppVct ? 0 : 10_000_000) +
    (o.selfVct ? 1_000_000 : 0) +
    (o.oppVcf ? 0 : 100_000) +
    (o.selfVcf ? 10_000 : 0) +
    emptyRushPenalty +
    (o.fourThree ? 5_000 : 0) +
    residual * 300 +
    o.forceWins * 100
  )
}

/** 应手后「对方有 VCT 而己方没有」——假抢先，直接丢弃 */
function isSuicidalForcing(o: ForcingOutcome): boolean {
  if (o.immediateWin || o.forceWins >= 2 || o.trueDual) return false
  return o.oppVct && !o.selfVct
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

  // —— 2. 己方 VCF（冲四强迫）——
  if (vcfMaxPly > 0) {
    const myVcf = findVcfMove(board, toPlay, vcfOpts)
    if (myVcf) return terminal(myVcf)
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
      if (
        o &&
        (o.immediateWin ||
          o.trueDual ||
          o.forceWins >= 2 ||
          (o.fourThree && !o.oppVct && !isSuicidalForcing(o)))
      ) {
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

  // —— 4. 已强制真双；对方有叉时确认 VCT 先于叉对杀（契约：软防仅强制/VCT 可抢）——
  {
    const dual = findTrueDualMove(board, toPlay, { rules, radius })
    if (dual) return terminal(dual)
  }
  if (oppForks.length > 0 && vctMaxPly > 0) {
    const myVct = findVctMove(board, toPlay, vctOpts)
    if (myVct) return terminal(myVct)
  }
  const race = pickForkRaceMove(board, toPlay, rules, radius)
  if (race) return terminal(race)

  // —— 5. 对方叉：统一强迫着 → 冲四留叉 ——
  if (oppForks.length > 0 && defense.length > 0) {
    const forcing = [
      ...findFourThreatMoves(board, toPlay, rules, radius),
      ...findForkThreeMoves(board, toPlay, rules, radius),
    ]
    const bestForce = pickBestForcingMove(board, toPlay, forcing, vctOpts, vcfOpts, rules, radius)
    if (bestForce) return terminal(bestForce)
    {
      const rush = findRushFourIntoForkMove(board, toPlay, { rules, radius })
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
