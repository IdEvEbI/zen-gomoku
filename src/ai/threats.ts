/**
 * 威胁检测（冲四 / 活三 / 必防）
 *
 * 形定义（本仓简化，与单测一致）：
 * - 一步胜：落子后 checkWinner
 * - 冲四：落子后己方存在「下一步可胜」点（对方不堵则负）
 * - 活三：落子后己方存在冲四点（对方不挡则可走成冲四）
 */

import { checkWinner } from '../core'
import { isLegalMove } from '../core/forbiddenMoves'
import { DEFAULT_RULE_SET, RULE_FREESTYLE, type RuleSetId } from '../core/rules'
import type { AiMove, AiPlayer } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'

/** 与 evaluate.DEFAULT_NEIGHBOR_RADIUS 对齐，避免循环依赖 */
const NEIGHBOR_RADIUS = 2

function other(p: AiPlayer): AiPlayer {
  return p === 1 ? 2 : 1
}

function moveKey(m: AiMove): string {
  return `${m.row},${m.col}`
}

function uniqueMoves(moves: AiMove[]): AiMove[] {
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

function hasNeighbor(board: number[][], row: number, col: number, radius: number): boolean {
  const size = board.length
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = row + dr
      const c = col + dc
      if (r < 0 || c < 0 || r >= size || c >= size) continue
      const v = board[r]?.[c]
      if (v === 1 || v === 2) return true
    }
  }
  return false
}

function candidatePool(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId,
  radius: number
): AiMove[] {
  const empty = listEmptyCells(board)
  const stoneCount = board.length * board.length - empty.length
  let pool: AiMove[]
  if (stoneCount === 0) {
    const mid = Math.floor(board.length / 2)
    pool = [{ row: mid, col: mid }]
  } else if (stoneCount <= 2) {
    pool = empty
  } else {
    const near = empty.filter((m) => hasNeighbor(board, m.row, m.col, radius))
    pool = near.length > 0 ? near : empty
  }
  if (rules === RULE_FREESTYLE) return pool
  return pool.filter((m) => isLegalMove(board, m.row, m.col, player, rules))
}

/** 一手当场五连的点 */
export function findWinningMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    const win = checkWinner(board, m.row, m.col, rules) === player
    board[m.row]![m.col] = 0
    if (win) out.push(m)
  }
  return out
}

/**
 * 冲四 / 活四类：落子后己方至少有一个「下一步可胜」点。
 * （含冲四与活四；不区分两端是否全开。）
 */
export function findFourThreatMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      continue
    }
    const threatens = findWinningMoves(board, player, rules, radius).length > 0
    board[m.row]![m.col] = 0
    if (threatens) out.push(m)
  }
  return out
}

/**
 * 活三（简化）：落子后未直接胜、未已是冲四，但存在冲四点。
 */
export function findOpenThreeMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      continue
    }
    if (findWinningMoves(board, player, rules, radius).length > 0) {
      board[m.row]![m.col] = 0
      continue
    }
    const makesFour = findFourThreatMoves(board, player, rules, radius).length > 0
    board[m.row]![m.col] = 0
    if (makesFour) out.push(m)
  }
  return out
}

/**
 * 当前行棋方必须优先考虑的防守点：
 * 1) 对方一步胜落点；
 * 2) 否则对方冲四点及其造成的胜点；
 * 3) 否则对方活三点（防其走成冲四）。
 */
export function listForcedReplies(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const opp = other(toPlay)
  const immediate = findWinningMoves(board, opp, rules, radius)
  if (immediate.length > 0) return uniqueMoves(immediate)

  const fours = findFourThreatMoves(board, opp, rules, radius)
  if (fours.length > 0) {
    const blocks: AiMove[] = [...fours]
    for (const f of fours) {
      board[f.row]![f.col] = opp
      blocks.push(...findWinningMoves(board, opp, rules, radius))
      board[f.row]![f.col] = 0
    }
    return uniqueMoves(blocks)
  }

  return uniqueMoves(findOpenThreeMoves(board, opp, rules, radius))
}

/** 进攻威胁 ∪ 防守点，供根节点优先展开 */
export function listThreatCandidates(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  return uniqueMoves([
    ...findWinningMoves(board, toPlay, rules, radius),
    ...listForcedReplies(board, toPlay, rules, radius),
    ...findFourThreatMoves(board, toPlay, rules, radius),
    ...findOpenThreeMoves(board, toPlay, rules, radius),
  ])
}

/**
 * 短威胁搜索：在只扩展「冲四 / 必防」的前提下，找强迫胜的一手。
 * 找不到返回 null。
 */
export function findForcedWinMove(
  board: number[][],
  player: AiPlayer,
  maxPly: number,
  rules: RuleSetId = DEFAULT_RULE_SET,
  shouldAbort?: () => boolean,
  radius = NEIGHBOR_RADIUS
): AiMove | null {
  if (maxPly <= 0) return null
  const wins = findWinningMoves(board, player, rules, radius)
  if (wins.length > 0) return wins[0]!

  const attacks = uniqueMoves([
    ...findFourThreatMoves(board, player, rules, radius),
    ...findOpenThreeMoves(board, player, rules, radius),
  ])

  for (const m of attacks) {
    if (shouldAbort?.()) return null
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      return m
    }
    const ok = forcedWinAfter(board, player, maxPly - 1, rules, shouldAbort, radius)
    board[m.row]![m.col] = 0
    if (ok) return m
  }
  return null
}

function forcedWinAfter(
  board: number[][],
  ai: AiPlayer,
  plyLeft: number,
  rules: RuleSetId,
  shouldAbort: (() => boolean) | undefined,
  radius: number
): boolean {
  if (plyLeft <= 0 || shouldAbort?.()) return false

  const toPlay = nextPlayerFromBoard(board)

  if (toPlay === ai) {
    if (findWinningMoves(board, ai, rules, radius).length > 0) return true
    const attacks = findFourThreatMoves(board, ai, rules, radius)
    for (const m of attacks) {
      if (shouldAbort?.()) return false
      board[m.row]![m.col] = ai
      const win =
        checkWinner(board, m.row, m.col, rules) === ai ||
        forcedWinAfter(board, ai, plyLeft - 1, rules, shouldAbort, radius)
      board[m.row]![m.col] = 0
      if (win) return true
    }
    return false
  }

  if (findWinningMoves(board, toPlay, rules, radius).length > 0) return false
  const replies = listForcedReplies(board, toPlay, rules, radius)
  if (replies.length === 0) return false

  for (const r of replies) {
    if (shouldAbort?.()) return false
    if (board[r.row]![r.col] !== 0) continue
    board[r.row]![r.col] = toPlay
    const still = forcedWinAfter(board, ai, plyLeft - 1, rules, shouldAbort, radius)
    board[r.row]![r.col] = 0
    if (!still) return false
  }
  return true
}
