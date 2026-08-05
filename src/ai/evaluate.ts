/**
 * 赢法数组评估（Heuristic / Minimax 叶子共用）
 */

import type { AiMove, AiPlayer } from './types'
import { listEmptyCells } from './types'
import { buildWinsCounts } from './winsTable'
import { isLegalMove } from '../core/forbiddenMoves'
import {
  DEFAULT_RULE_SET,
  RULE_FREESTYLE,
  type RuleSetId,
} from '../core/rules'

export const OPPONENT_SCORE = [0, 200, 400, 2000, 10000] as const
export const SELF_SCORE = [0, 220, 420, 2400, 20000] as const

/** 终局分，须远大于启发累加 */
export const WIN_SCORE = 10_000_000

export const DEFAULT_NEIGHBOR_RADIUS = 2

export function filterLegalCandidates(
  board: number[][],
  moves: AiMove[],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET
): AiMove[] {
  if (rules === RULE_FREESTYLE) return moves
  return moves.filter((m) => isLegalMove(board, m.row, m.col, player, rules))
}

/**
 * 从 perspective 视角评估整盘：己方赢法加分、对方赢法减分
 */
export function evaluateBoard(
  board: number[][],
  perspective: AiPlayer,
  wins: boolean[][][],
  winsCount: number
): number {
  const opp = (perspective === 1 ? 2 : 1) as AiPlayer
  const selfCounts = buildWinsCounts(board, wins, winsCount, perspective)
  const oppCounts = buildWinsCounts(board, wins, winsCount, opp)
  let score = 0
  for (let k = 0; k < winsCount; k++) {
    const sc = selfCounts[k] ?? 0
    const oc = oppCounts[k] ?? 0
    if (sc > 0 && sc <= 4) score += SELF_SCORE[sc]!
    if (oc > 0 && oc <= 4) score -= OPPONENT_SCORE[oc]!
  }
  return score
}

/**
 * 对空位 (row,col) 打启发分（进攻/防守取大），供选点与走法排序
 */
export function scoreEmptyCell(
  row: number,
  col: number,
  _player: AiPlayer,
  selfCounts: number[],
  oppCounts: number[],
  wins: boolean[][][],
  winsCount: number,
  boardSize: number
): number {
  let selfScore = 0
  let oppScore = 0
  for (let k = 0; k < winsCount; k++) {
    if (!wins[row]?.[col]?.[k]) continue
    const oc = oppCounts[k] ?? 0
    const sc = selfCounts[k] ?? 0
    if (oc > 0 && oc <= 4) oppScore += OPPONENT_SCORE[oc]!
    if (sc > 0 && sc <= 4) selfScore += SELF_SCORE[sc]!
  }
  const mid = (boardSize - 1) / 2
  const dist = Math.abs(row - mid) + Math.abs(col - mid)
  const center = Math.max(0, 50 - dist * 3)
  return Math.max(selfScore, oppScore) + center
}

export function hasNeighbor(
  board: number[][],
  row: number,
  col: number,
  radius = DEFAULT_NEIGHBOR_RADIUS
): boolean {
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

export function listNeighborCandidates(
  board: number[][],
  radius = DEFAULT_NEIGHBOR_RADIUS,
  player?: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET
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
  if (player === undefined) return pool
  return filterLegalCandidates(board, pool, player, rules)
}

/** 按启发分降序的候选，截断到 limit */
export function listOrderedCandidates(
  board: number[][],
  player: AiPlayer,
  wins: boolean[][][],
  winsCount: number,
  limit: number,
  radius = DEFAULT_NEIGHBOR_RADIUS,
  rules: RuleSetId = DEFAULT_RULE_SET
): AiMove[] {
  const boardSize = board.length
  const candidates = listNeighborCandidates(board, radius, player, rules)
  const opp = (player === 1 ? 2 : 1) as AiPlayer
  const selfCounts = buildWinsCounts(board, wins, winsCount, player)
  const oppCounts = buildWinsCounts(board, wins, winsCount, opp)

  const scored = candidates.map((m) => ({
    move: m,
    score: scoreEmptyCell(
      m.row,
      m.col,
      player,
      selfCounts,
      oppCounts,
      wins,
      winsCount,
      boardSize
    ),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, Math.max(1, limit)).map((s) => s.move)
}
