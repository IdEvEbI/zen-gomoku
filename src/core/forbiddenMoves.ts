/**
 * 中国规则禁手（仅黑）：长连、三三、四四
 *
 * 活四：该轴上两端空点落下均可成五（或连续四子且两端开口，计 1）。
 * 冲四：仅一端落下可成五 —— **不是**活四。
 * 活三：存在空点，落下后形成活四（故眠三延伸成冲四不算活三）。
 * 三三：至少两个方向形成活三；已成四的方向不计入（四三合法）。
 *
 * 约定：调用方保证 board[row][col] 已落黑子 (1)，再判定该点是否禁手。
 */

export type ForbiddenKind = 'overline' | 'double-three' | 'double-four'

import type { RuleSetId } from './rules'
import { RULE_FREESTYLE } from './rules'

const EMPTY = 0
const BLACK = 1

/** 四向：每向两个相反单位向量 (dRow, dCol) */
const AXIS_DIRS: readonly [readonly [number, number], readonly [number, number]][] = [
  [
    [0, -1],
    [0, 1],
  ],
  [
    [-1, 0],
    [1, 0],
  ],
  [
    [-1, -1],
    [1, 1],
  ],
  [
    [-1, 1],
    [1, -1],
  ],
]

function inBoard(board: number[][], row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < board.length && col < (board[0]?.length ?? 0)
}

function stoneCountOnAxis(
  board: number[][],
  row: number,
  col: number,
  stone: number,
  axis: number
): number {
  let cnt = 1
  const pair = AXIS_DIRS[axis]
  if (!pair) return cnt
  for (const [dr, dc] of pair) {
    let r = row + dr
    let c = col + dc
    while (inBoard(board, r, c) && board[r]![c] === stone) {
      cnt++
      r += dr
      c += dc
    }
  }
  return cnt
}

function isFiveOnAxis(
  board: number[][],
  row: number,
  col: number,
  stone: number,
  axis: number
): boolean {
  return stoneCountOnAxis(board, row, col, stone, axis) === 5
}

function isFiveAnywhere(board: number[][], row: number, col: number, stone: number): boolean {
  for (let axis = 0; axis < 4; axis++) {
    if (isFiveOnAxis(board, row, col, stone, axis)) return true
  }
  return false
}

function isOverline(board: number[][], row: number, col: number, stone: number): boolean {
  for (let axis = 0; axis < 4; axis++) {
    if (stoneCountOnAxis(board, row, col, stone, axis) > 5) return true
  }
  return false
}

/** 沿单方向走到该色尽头后的空点 */
function findEmptyBeyond(
  board: number[][],
  row: number,
  col: number,
  stone: number,
  dr: number,
  dc: number
): { row: number; col: number } | null {
  let r = row + dr
  let c = col + dc
  while (inBoard(board, r, c) && board[r]![c] === stone) {
    r += dr
    c += dc
  }
  if (inBoard(board, r, c) && board[r]![c] === EMPTY) {
    return { row: r, col: c }
  }
  return null
}

/**
 * 该轴上「落入可成五」的空点数（两端各至多算一次）。
 * 用于区分冲四(1)与活四(2)。
 */
function fiveMakingEmptyCount(
  board: number[][],
  row: number,
  col: number,
  stone: number,
  axis: number
): number {
  let cnt = 0
  const pair = AXIS_DIRS[axis]
  if (!pair) return 0
  for (const [dr, dc] of pair) {
    const empty = findEmptyBeyond(board, row, col, stone, dr, dc)
    if (!empty) continue
    const cell = board[empty.row]![empty.col]
    if (cell !== EMPTY) continue
    board[empty.row]![empty.col] = stone
    const ok = isFiveOnAxis(board, empty.row, empty.col, stone, axis)
    board[empty.row]![empty.col] = EMPTY
    if (ok) cnt++
  }
  return cnt
}

/** 冲四或活四：至少一端空点落下可成五 */
function hasFourOnAxis(
  board: number[][],
  row: number,
  col: number,
  stone: number,
  axis: number
): boolean {
  return fiveMakingEmptyCount(board, row, col, stone, axis) >= 1
}

/**
 * 是否为活四（返回 1 表示是，0 表示否）。
 * 仅当两端均可成五，且为连续四子时计为活四。
 * 注意：仅一端可成五是冲四，此处返回 0。
 */
function liveFourScoreOnAxis(
  board: number[][],
  row: number,
  col: number,
  stone: number,
  axis: number
): number {
  if (isFiveOnAxis(board, row, col, stone, axis)) return 0
  const cnt = fiveMakingEmptyCount(board, row, col, stone, axis)
  if (cnt === 2 && stoneCountOnAxis(board, row, col, stone, axis) === 4) {
    return 1
  }
  return 0
}

/**
 * 试落「活四」点时的禁手筛：只查长连/四四，避免与三三检测递归互咬。
 */
function isForbiddenAsOpenFourPoint(board: number[][], row: number, col: number): boolean {
  if (board[row]?.[col] !== BLACK) return false
  if (isFiveAnywhere(board, row, col, BLACK)) return false
  if (isOverline(board, row, col, BLACK)) return true
  if (isDoubleFour(board, row, col, BLACK)) return true
  return false
}

/**
 * 活三：该轴存在空点，落下后形成活四（不是冲四）。
 */
function hasOpenThreeOnAxis(
  board: number[][],
  row: number,
  col: number,
  stone: number,
  axis: number
): boolean {
  const pair = AXIS_DIRS[axis]
  if (!pair) return false
  for (const [dr, dc] of pair) {
    const empty = findEmptyBeyond(board, row, col, stone, dr, dc)
    if (!empty) continue
    board[empty.row]![empty.col] = stone
    const isLiveFour = liveFourScoreOnAxis(board, empty.row, empty.col, stone, axis) === 1
    const stillAllowed = !isForbiddenAsOpenFourPoint(board, empty.row, empty.col)
    board[empty.row]![empty.col] = EMPTY
    if (isLiveFour && stillAllowed) return true
  }
  return false
}

function isDoubleThree(board: number[][], row: number, col: number, stone: number): boolean {
  let cnt = 0
  for (let axis = 0; axis < 4; axis++) {
    // 已成四的方向不计活三（四三合法，不可误判三三）
    if (hasFourOnAxis(board, row, col, stone, axis)) continue
    if (hasOpenThreeOnAxis(board, row, col, stone, axis)) cnt++
  }
  return cnt >= 2
}

function isDoubleFour(board: number[][], row: number, col: number, stone: number): boolean {
  let cnt = 0
  for (let axis = 0; axis < 4; axis++) {
    const live = liveFourScoreOnAxis(board, row, col, stone, axis)
    if (live === 1) {
      // 活四本身两端都能成五，按 Renju 惯例在四四统计里计 1 个「四」
      cnt += 1
    } else if (hasFourOnAxis(board, row, col, stone, axis)) {
      cnt += 1
    }
  }
  return cnt >= 2
}

/**
 * 黑子落在 (row,col) 后是否为禁手（board 已含该黑子）。
 * 成五优先：恰五连则非禁手。
 */
export function isForbiddenBlackMove(board: number[][], row: number, col: number): boolean {
  return getForbiddenKind(board, row, col) !== null
}

export function getForbiddenKind(
  board: number[][],
  row: number,
  col: number
): ForbiddenKind | null {
  if (board[row]?.[col] !== BLACK) return null
  if (isFiveAnywhere(board, row, col, BLACK)) return null
  if (isOverline(board, row, col, BLACK)) return 'overline'
  if (isDoubleFour(board, row, col, BLACK)) return 'double-four'
  if (isDoubleThree(board, row, col, BLACK)) return 'double-three'
  return null
}

export function forbiddenKindMessage(kind: ForbiddenKind): string {
  switch (kind) {
    case 'overline':
      return '黑方长连禁手'
    case 'double-three':
      return '黑方三三禁手'
    case 'double-four':
      return '黑方四四禁手'
  }
}

/**
 * 空位是否可给 player 下（禁手规则下过滤黑方禁手点）
 * 会临时改写 board 再还原。
 */
export function isLegalMove(
  board: number[][],
  row: number,
  col: number,
  player: 1 | 2,
  rules: RuleSetId
): boolean {
  if (!inBoard(board, row, col)) return false
  if (board[row]![col] !== EMPTY) return false
  if (rules === RULE_FREESTYLE || player !== BLACK) return true
  board[row]![col] = BLACK
  const bad = isForbiddenBlackMove(board, row, col)
  board[row]![col] = EMPTY
  return !bad
}

export interface BoardPoint {
  row: number
  col: number
}

/**
 * 列出当前盘面上黑方若落子则为禁手的空点（供 UI 红叉标记）。
 * 自由规则返回空数组。
 */
export function listForbiddenEmptyCells(board: number[][], rules: RuleSetId): BoardPoint[] {
  if (rules === RULE_FREESTYLE) return []
  const out: BoardPoint[] = []
  for (let row = 0; row < board.length; row++) {
    const line = board[row]
    if (!line) continue
    for (let col = 0; col < line.length; col++) {
      if (line[col] !== EMPTY) continue
      if (!isLegalMove(board, row, col, BLACK, rules)) {
        out.push({ row, col })
      }
    }
  }
  return out
}
