/**
 * 根节点着法策略（与 Minimax 搜索解耦）
 *
 * 棋风：硬威胁必挡；活三必应且直接取兼攻最优挡（边消边造）；
 * 双方有叉且无活三时可抢攻；其余叉/冲四软威胁再搜「挡∪攻」。
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
import { findVcfDefense, findVcfMove } from './vcf'
import { checkWinner } from '../core'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'

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
  shouldAbortVcf?: () => boolean
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

  let bestOwn: AiMove | null = null
  let bestOwnL = Number.NEGATIVE_INFINITY
  for (const f of myForks) {
    const L = measureAttackLethality(board, toPlay, f, rules, radius)
    if (L > bestOwnL) {
      bestOwnL = L
      bestOwn = f
    }
  }
  if (!bestOwn || bestOwnL < RACE_MIN_LETHALITY) return null

  let bestOppL = Number.NEGATIVE_INFINITY
  for (const f of oppForks) {
    const L = measureAttackLethality(board, opp, f, rules, radius)
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
    board[searchMove.row]![searchMove.col] = 0

    if (stillWin > 0) return floor
    // 双活四抢攻仅当对方已无活三/叉可兑；留叉抢攻会重复 03-36-44 的 (10,10)/(8,10)
    if (myOF >= 2 && stillOF === 0 && stillFork === 0) return searchMove
    if (stillOF > 0 || stillFork > 0) return floor
  }

  if (searchScore > floorScore) return floor
  return searchMove
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
  const opp = other(toPlay)
  const vcfOpts = {
    maxPly: vcfMaxPly,
    rules,
    radius,
    shouldAbort: options.shouldAbortVcf,
  }

  const instant = findWinningMoves(board, toPlay, rules, radius)
  if (instant.length > 0) {
    return {
      type: 'terminal',
      move: instant[Math.floor(Math.random() * instant.length)]!,
    }
  }

  const hard = listHardForcedReplies(board, toPlay, rules, radius)
  if (hard.length > 0) {
    const move = pickBestForcedReply(board, toPlay, hard, rules, radius) ?? hard[0]!
    return { type: 'terminal', move }
  }

  const myOpenFours = findOpenFourMoves(board, toPlay, rules, radius)
  if (myOpenFours.length > 0) {
    return {
      type: 'terminal',
      move: myOpenFours[Math.floor(Math.random() * myOpenFours.length)]!,
    }
  }

  if (vcfMaxPly > 0) {
    // 快路径：一手造成双胜点（开四/双冲四）直接走，不穷举
    const quick = findFourThreatMoves(board, toPlay, rules, radius)
    for (const m of quick) {
      board[m.row]![m.col] = toPlay
      const wins = findWinningMoves(board, toPlay, rules, radius).length
      const won = checkWinner(board, m.row, m.col, rules) === toPlay
      board[m.row]![m.col] = 0
      if (won || wins >= 2) return { type: 'terminal', move: m }
    }
  }

  const race = pickForkRaceMove(board, toPlay, rules, radius)
  if (race) return { type: 'terminal', move: race }

  const defense = listSoftDefenseCandidates(board, toPlay, rules, radius)
  if (defense.length > 0) {
    // 活三（可成活四）：直接兼攻最优挡，避免「搜来搜去只剩纯堵」
    if (findOpenFourMoves(board, opp, rules, radius).length > 0) {
      const move = pickBestForcedReply(board, toPlay, defense, rules, radius) ?? defense[0]!
      return { type: 'terminal', move }
    }
    // 叉 / 冲四软威胁：仍搜挡∪攻，底线兜住
    return {
      type: 'search',
      restrict: listSoftRootCandidates(board, toPlay, softRootLimit, rules, radius),
      defenseFloor: defense,
    }
  }

  // 无软威胁：深层己方 VCF + 对方 VCF 必防
  if (vcfMaxPly > 0) {
    const myVcf = findVcfMove(board, toPlay, vcfOpts)
    if (myVcf) return { type: 'terminal', move: myVcf }

    if (findFourThreatMoves(board, opp, rules, radius).length > 0) {
      const vcfBlocks = findVcfDefense(board, toPlay, vcfOpts)
      if (vcfBlocks.length > 0) {
        const move = pickBestForcedReply(board, toPlay, vcfBlocks, rules, radius) ?? vcfBlocks[0]!
        return { type: 'terminal', move }
      }
    }
  }

  return { type: 'search', restrict: null, defenseFloor: [] }
}
