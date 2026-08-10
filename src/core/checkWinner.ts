/**
 * 胜负判定：给定棋盘与最后落子位置，沿横、竖、两斜检测连珠
 * - freestyle：≥5 即胜（长连亦胜）
 * - renju-cn：白 ≥5 胜；黑恰 5 胜；黑长连（≥6）不记胜（应由禁手拦截）
 */

import { DEFAULT_RULE_SET, RULE_FREESTYLE, RULE_RENJU_CN, type RuleSetId } from './rules'

const BOARD_SIZE = 15

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const

function countInDirection(
  board: number[][],
  row: number,
  col: number,
  dr: number,
  dc: number
): number {
  const player = board[row]?.[col]
  if (player !== 1 && player !== 2) return 0
  let count = 0
  let r = row
  let c = col
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]?.[c] === player) {
    count++
    r += dr
    c += dc
  }
  return count
}

function maxLineLength(board: number[][], lastRow: number, lastCol: number): number {
  let best = 0
  for (const [dr, dc] of DIRECTIONS) {
    const forward = countInDirection(board, lastRow, lastCol, dr, dc)
    const backward = countInDirection(board, lastRow, lastCol, -dr, -dc)
    best = Math.max(best, forward + backward - 1)
  }
  return best
}

/**
 * 若该子形成有效五连则返回赢家（1 黑 2 白），否则返回 null
 */
export function checkWinner(
  board: number[][],
  lastRow: number,
  lastCol: number,
  rules: RuleSetId = DEFAULT_RULE_SET
): 1 | 2 | null {
  const player = board[lastRow]?.[lastCol]
  if (player !== 1 && player !== 2) return null

  const len = maxLineLength(board, lastRow, lastCol)

  if (rules === RULE_FREESTYLE) {
    return len >= 5 ? (player as 1 | 2) : null
  }

  if (rules === RULE_RENJU_CN) {
    if (player === 2) {
      return len >= 5 ? 2 : null
    }
    // 黑：恰五胜，长连不记胜
    return len === 5 ? 1 : null
  }

  return null
}
