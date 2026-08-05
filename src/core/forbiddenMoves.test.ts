/**
 * 禁手单测：长连 / 三三 / 四四；成五非禁手
 */

import { describe, it, expect } from 'vitest'
import {
  getForbiddenKind,
  isForbiddenBlackMove,
  isLegalMove,
  listForbiddenEmptyCells,
} from './forbiddenMoves'
import { RULE_FREESTYLE, RULE_RENJU_CN } from './rules'
import { checkWinner } from './checkWinner'

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function place(board: number[][], cells: [number, number, number][]): void {
  for (const [r, c, p] of cells) {
    board[r]![c] = p
  }
}

describe('forbiddenMoves', () => {
  it('overline: six in a row is forbidden for black', () => {
    const board = emptyBoard()
    // .....XXXXX.  then black plays to make 6 — place five then sixth
    place(board, [
      [7, 3, 1],
      [7, 4, 1],
      [7, 5, 1],
      [7, 6, 1],
      [7, 7, 1],
    ])
    board[7]![8] = 1
    expect(getForbiddenKind(board, 7, 8)).toBe('overline')
    expect(isForbiddenBlackMove(board, 7, 8)).toBe(true)
    expect(checkWinner(board, 7, 8, RULE_RENJU_CN)).toBeNull()
  })

  it('exact five is win, not forbidden', () => {
    const board = emptyBoard()
    place(board, [
      [7, 3, 1],
      [7, 4, 1],
      [7, 5, 1],
      [7, 6, 1],
    ])
    board[7]![7] = 1
    expect(getForbiddenKind(board, 7, 7)).toBeNull()
    expect(checkWinner(board, 7, 7, RULE_RENJU_CN)).toBe(1)
  })

  it('double-three: classic fork is forbidden', () => {
    // Shape: two open threes meeting at one empty point
    //   . . X . .
    //   . . X . .
    // X X . X X   <- play center of the gap? classic:
    // Horizontal potential: XX.XX with empty in middle is 四, not 三
    // Classic 三三:
    //     .
    //   . X .
    // . X + X .   wait
    //
    // Common fixture:
    // stones at (7,5)(7,6) and (5,7)(6,7); empty (7,7) creates .XX. and .XX. open threes
    const board = emptyBoard()
    place(board, [
      [7, 5, 1],
      [7, 6, 1],
      [5, 7, 1],
      [6, 7, 1],
    ])
    // also need outer empties for 活三 — (7,4)(7,8) and (4,7)(8,7) empty
    board[7]![7] = 1
    expect(getForbiddenKind(board, 7, 7)).toBe('double-three')
  })

  it('double-four: two fours meeting without five is forbidden', () => {
    const board = emptyBoard()
    place(board, [
      [7, 4, 1],
      [7, 5, 1],
      [7, 6, 1],
      [4, 7, 1],
      [5, 7, 1],
      [6, 7, 1],
    ])
    board[7]![7] = 1
    expect(getForbiddenKind(board, 7, 7)).toBe('double-four')
    expect(checkWinner(board, 7, 7, RULE_RENJU_CN)).toBeNull()
  })

  it('four-three fork is legal (not double-three)', () => {
    // 横：冲四；竖：活三 → 四三合法
    const board = emptyBoard()
    place(board, [
      [7, 4, 1],
      [7, 5, 1],
      [7, 6, 1],
      // 一端堵住，使横为冲四而非活四
      [7, 3, 2],
      [5, 8, 1],
      [6, 8, 1],
    ])
    board[7]![8] = 1
    // 横：WXXX B → 冲四；竖：.XXB. 类活三
    expect(getForbiddenKind(board, 7, 8)).toBeNull()
  })

  it('sleeping three is not open three (no false double-three)', () => {
    // 两路眠三交叉不应判三三
    const board = emptyBoard()
    place(board, [
      [7, 5, 1],
      [7, 6, 1],
      [7, 4, 2], // 堵住横一端
      [5, 7, 1],
      [6, 7, 1],
      [4, 7, 2], // 堵住竖一端
    ])
    board[7]![7] = 1
    expect(getForbiddenKind(board, 7, 7)).toBeNull()
  })

  it('isLegalMove respects rules for black', () => {
    const board = emptyBoard()
    place(board, [
      [7, 5, 1],
      [7, 6, 1],
      [5, 7, 1],
      [6, 7, 1],
    ])
    expect(isLegalMove(board, 7, 7, 1, RULE_RENJU_CN)).toBe(false)
    expect(isLegalMove(board, 7, 7, 1, RULE_FREESTYLE)).toBe(true)
    expect(isLegalMove(board, 7, 7, 2, RULE_RENJU_CN)).toBe(true)
  })

  it('listForbiddenEmptyCells marks classic double-three point', () => {
    const board = emptyBoard()
    place(board, [
      [7, 5, 1],
      [7, 6, 1],
      [5, 7, 1],
      [6, 7, 1],
    ])
    const pts = listForbiddenEmptyCells(board, RULE_RENJU_CN)
    expect(pts.some((p) => p.row === 7 && p.col === 7)).toBe(true)
    expect(listForbiddenEmptyCells(board, RULE_FREESTYLE)).toEqual([])
  })

  it('white overline wins under renju', () => {
    const board = emptyBoard()
    place(board, [
      [7, 2, 2],
      [7, 3, 2],
      [7, 4, 2],
      [7, 5, 2],
      [7, 6, 2],
    ])
    board[7]![7] = 2
    expect(checkWinner(board, 7, 7, RULE_RENJU_CN)).toBe(2)
  })
})
