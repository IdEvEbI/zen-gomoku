/**
 * 赢法数组评估（Heuristic / Minimax 叶子共用）
 * 另加形分（冲四 / 活三），与 threats.ts 定义一致
 */

import { checkWinner } from '../core'
import { isLegalMove } from '../core/forbiddenMoves'
import { DEFAULT_RULE_SET, RULE_FREESTYLE, type RuleSetId } from '../core/rules'
import type { AiMove, AiPlayer } from './types'
import { listEmptyCells } from './types'
import { findFourThreatMoves, findWinningMoves } from './threats'
import { buildWinsCounts } from './winsTable'

export const OPPONENT_SCORE = [0, 200, 400, 2000, 10000] as const
export const SELF_SCORE = [0, 220, 420, 2400, 20000] as const

/** 冲四档：必应 */
export const CRITICAL_THREAT_SCORE = Math.min(OPPONENT_SCORE[4]!, SELF_SCORE[4]!)
/** 活三/冲三档：亦必须应手，禁止软随机漏堵 */
export const URGENT_THREAT_SCORE = Math.min(OPPONENT_SCORE[3]!, SELF_SCORE[3]!)

/** 形分：冲四接近/超过四连档；活三显著高于「赢法 2 子」 */
export const SHAPE_SELF_FOUR = 12_000
export const SHAPE_SELF_OPEN_THREE = 2_800
export const SHAPE_OPP_FOUR = 10_000
export const SHAPE_OPP_OPEN_THREE = 2_200

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

function shapeBonusForSide(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId,
  fourW: number,
  _threeW: number
): number {
  // 仅统计冲四档，避免叶子上反复跑 open-three（时限杀手）
  return findFourThreatMoves(board, player, rules).length * fourW
}

/**
 * 从 perspective 视角评估整盘：己方赢法加分、对方赢法减分 + 形分
 */
export function evaluateBoard(
  board: number[][],
  perspective: AiPlayer,
  wins: boolean[][][],
  winsCount: number,
  rules: RuleSetId = DEFAULT_RULE_SET
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
  score += shapeBonusForSide(board, perspective, rules, SHAPE_SELF_FOUR, SHAPE_SELF_OPEN_THREE)
  score -= shapeBonusForSide(board, opp, rules, SHAPE_OPP_FOUR, SHAPE_OPP_OPEN_THREE)
  return score
}

/**
 * 对空位 (row,col) 打启发分（攻防累加 + 形分 + 中心）
 */
export function scoreEmptyCell(
  row: number,
  col: number,
  player: AiPlayer,
  selfCounts: number[],
  oppCounts: number[],
  wins: boolean[][][],
  winsCount: number,
  boardSize: number,
  board?: number[][],
  rules: RuleSetId = DEFAULT_RULE_SET
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
  const defenseBias = oppScore >= URGENT_THREAT_SCORE ? oppScore * 0.15 : 0

  let shape = 0
  if (board && board[row]?.[col] === 0) {
    const opp = (player === 1 ? 2 : 1) as AiPlayer
    board[row]![col] = player
    if (checkWinner(board, row, col, rules) === player) {
      shape += SHAPE_SELF_FOUR * 2
    } else if (findWinningMoves(board, player, rules).length > 0) {
      shape += SHAPE_SELF_FOUR
    } else if (findFourThreatMoves(board, player, rules).length > 0) {
      shape += SHAPE_SELF_OPEN_THREE
    }
    board[row]![col] = 0

    board[row]![col] = opp
    if (checkWinner(board, row, col, rules) === opp) {
      shape += SHAPE_OPP_FOUR * 1.1
    } else if (findWinningMoves(board, opp, rules).length > 0) {
      shape += SHAPE_OPP_FOUR
    } else if (findFourThreatMoves(board, opp, rules).length > 0) {
      shape += SHAPE_OPP_OPEN_THREE
    }
    board[row]![col] = 0
  }

  return selfScore + oppScore + defenseBias + center + shape
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

function moveKey(m: AiMove): string {
  return `${m.row},${m.col}`
}

/**
 * 威胁点优先，再按启发分补齐；威胁点在截断前必留。
 */
export function listOrderedCandidates(
  board: number[][],
  player: AiPlayer,
  wins: boolean[][][],
  winsCount: number,
  limit: number,
  radius = DEFAULT_NEIGHBOR_RADIUS,
  rules: RuleSetId = DEFAULT_RULE_SET,
  threatMoves: AiMove[] = []
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
      boardSize,
      board,
      rules
    ),
  }))
  scored.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const priority: AiMove[] = []
  for (const m of threatMoves) {
    if (board[m.row]?.[m.col] !== 0) continue
    const k = moveKey(m)
    if (seen.has(k)) continue
    seen.add(k)
    priority.push(m)
  }
  const rest: AiMove[] = []
  for (const s of scored) {
    const k = moveKey(s.move)
    if (seen.has(k)) continue
    seen.add(k)
    rest.push(s.move)
  }
  // 威胁点必留；其余补齐到 limit
  const fill = Math.max(0, limit - priority.length)
  const out = [...priority, ...rest.slice(0, fill)]
  return out.length > 0 ? out : scored.slice(0, Math.max(1, limit)).map((s) => s.move)
}
