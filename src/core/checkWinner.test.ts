import { describe, it, expect } from 'vitest'
import { checkWinner } from './checkWinner'

const SIZE = 15

function emptyBoard(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

describe('checkWinner', () => {
  it('returns null for empty or single piece', () => {
    const board = emptyBoard()
    expect(checkWinner(board, 0, 0)).toBe(null)
    board[7]![7] = 1
    expect(checkWinner(board, 7, 7)).toBe(null)
  })

  it('returns 1 for black horizontal five', () => {
    const board = emptyBoard()
    for (let c = 0; c < 5; c++) board[7]![c] = 1
    expect(checkWinner(board, 7, 2)).toBe(1)
    expect(checkWinner(board, 7, 0)).toBe(1)
    expect(checkWinner(board, 7, 4)).toBe(1)
  })

  it('returns 2 for white vertical five', () => {
    const board = emptyBoard()
    for (let r = 0; r < 5; r++) board[r]![7] = 2
    expect(checkWinner(board, 2, 7)).toBe(2)
  })

  it('returns 1 for black main diagonal five', () => {
    const board = emptyBoard()
    for (let i = 0; i < 5; i++) board[i]![i] = 1
    expect(checkWinner(board, 2, 2)).toBe(1)
  })

  it('returns 2 for white anti-diagonal five', () => {
    const board = emptyBoard()
    for (let i = 0; i < 5; i++) board[i]![4 - i] = 2
    expect(checkWinner(board, 2, 2)).toBe(2)
  })

  it('returns null for four in a row', () => {
    const board = emptyBoard()
    for (let c = 0; c < 4; c++) board[0]![c] = 1
    expect(checkWinner(board, 0, 1)).toBe(null)
  })

  it('returns winner for five with last piece in middle', () => {
    const board = emptyBoard()
    board[5]![3] = 1
    board[5]![4] = 1
    board[5]![5] = 1 // last
    board[5]![6] = 1
    board[5]![7] = 1
    expect(checkWinner(board, 5, 5)).toBe(1)
  })
})
