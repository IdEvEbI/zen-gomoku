import { describe, it, expect } from 'vitest'
import {
  findWinningMoves,
  findFourThreatMoves,
  findOpenThreeMoves,
  findForkThreeMoves,
  listForcedReplies,
  findForcedWinMove,
} from './threats'
import { MinimaxAgent } from './MinimaxAgent'
import { createAgentForDifficulty } from './difficulty'

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function apply(board: number[][], moves: Array<[number, number, number]>) {
  for (const [r, c, p] of moves) board[r]![c] = p
}

describe('threats', () => {
  it('findWinningMoves: blocks / takes open four cell', () => {
    const board = emptyBoard()
    for (let c = 0; c < 4; c++) board[7]![c] = 1
    const wins = findWinningMoves(board, 1)
    expect(wins.some((m) => m.row === 7 && m.col === 4)).toBe(true)
  })

  it('listForcedReplies: must block opponent four', () => {
    const board = emptyBoard()
    for (let c = 0; c < 4; c++) board[7]![c] = 1
    board[0]![0] = 2
    board[0]![1] = 2
    board[0]![2] = 2
    const forced = listForcedReplies(board, 2)
    expect(forced.some((m) => m.row === 7 && m.col === 4)).toBe(true)
  })

  it('findOpenThreeMoves: diagonal live three point', () => {
    const board = emptyBoard()
    board[6]![6] = 1
    board[7]![7] = 1
    board[0]![0] = 2
    const threes = findOpenThreeMoves(board, 1)
    expect(threes.some((m) => m.row === 8 && m.col === 8)).toBe(true)
  })

  it('findFourThreatMoves: completing open three into rush four', () => {
    const board = emptyBoard()
    board[7]![5] = 1
    board[7]![6] = 1
    board[7]![7] = 1
    board[0]![0] = 2
    const fours = findFourThreatMoves(board, 1)
    expect(fours.length).toBeGreaterThan(0)
    expect(fours.some((m) => (m.row === 7 && m.col === 4) || (m.row === 7 && m.col === 8))).toBe(
      true
    )
  })

  it('listForcedReplies: live three → open-four ends', () => {
    const board = emptyBoard()
    board[7]![5] = 1
    board[7]![6] = 1
    board[7]![7] = 1
    board[0]![0] = 2
    board[0]![1] = 2
    board[0]![2] = 2
    const forced = listForcedReplies(board, 2)
    expect(forced.some((m) => m.row === 7 && m.col === 4)).toBe(true)
    expect(forced.some((m) => m.row === 7 && m.col === 8)).toBe(true)
  })

  it('findForcedWinMove: live four forces win', () => {
    const board = emptyBoard()
    board[7]![7] = 2
    board[7]![8] = 2
    board[7]![9] = 2
    board[0]![0] = 1
    board[0]![1] = 1
    board[0]![2] = 1
    board[1]![0] = 1
    const move = findForcedWinMove(board, 2, 8)
    expect(move).not.toBeNull()
    expect(move!.row).toBe(7)
    expect([6, 10]).toContain(move!.col)
  })
})

describe('regression: zen-gomoku-2026-08-06-09-00-46', () => {
  const beforeWhite45: Array<[number, number, number]> = [
    [7, 7, 1],
    [6, 7, 2],
    [8, 6, 1],
    [6, 8, 2],
    [8, 5, 1],
    [8, 9, 2],
    [7, 5, 1],
  ]

  const afterBlack95: Array<[number, number, number]> = [...beforeWhite45, [4, 5, 2], [9, 5, 1]]

  it('fork at (9,5) is forced; set stays small', () => {
    const board = emptyBoard()
    apply(board, beforeWhite45)
    const forks = findForkThreeMoves(board, 1)
    expect(forks.some((m) => m.row === 9 && m.col === 5)).toBe(true)
    const forced = listForcedReplies(board, 2)
    expect(forced.some((m) => m.row === 9 && m.col === 5)).toBe(true)
    expect(forced.length).toBeLessThan(8)
  })

  it('after (9,5): force (6,5)/(10,5), exclude gap (5,5)', () => {
    const board = emptyBoard()
    apply(board, afterBlack95)
    const forced = listForcedReplies(board, 2)
    expect(forced.some((m) => m.row === 6 && m.col === 5)).toBe(true)
    expect(forced.some((m) => m.row === 10 && m.col === 5)).toBe(true)
    expect(forced.some((m) => m.row === 5 && m.col === 5)).toBe(false)
  })

  it('Tang blocks live three end, not gap (5,5)', async () => {
    const board = emptyBoard()
    apply(board, afterBlack95)
    const agent = createAgentForDifficulty('tang')
    for (let i = 0; i < 5; i++) {
      const move = await agent.getNextMove(board)
      expect(move).not.toBeNull()
      const ok = (move!.row === 6 && move!.col === 5) || (move!.row === 10 && move!.col === 5)
      expect(ok).toBe(true)
    }
  })

  it('Tang reply is inside tightened forced set', async () => {
    const board = emptyBoard()
    apply(board, beforeWhite45)
    const agent = createAgentForDifficulty('tang')
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    const forced = listForcedReplies(board, 2)
    expect(forced.some((m) => m.row === move!.row && m.col === move!.col)).toBe(true)
  })
})

describe('Tang / Minimax threat integration', () => {
  it('Tang blocks open three', async () => {
    const agent = createAgentForDifficulty('tang')
    const board = emptyBoard()
    board[7]![5] = 1
    board[7]![6] = 1
    board[7]![7] = 1
    board[0]![0] = 2
    board[0]![1] = 2
    board[0]![2] = 2
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect((move!.row === 7 && move!.col === 4) || (move!.row === 7 && move!.col === 8)).toBe(true)
  })

  it('Tang takes forced win from live-four setup', async () => {
    const agent = new MinimaxAgent({
      name: 'tang-test',
      maxDepth: 3,
      timeLimitMs: 800,
      candidateLimit: 14,
      iterativeDeepening: true,
      threatSearchPly: 8,
    })
    const board = emptyBoard()
    board[7]![7] = 2
    board[7]![8] = 2
    board[7]![9] = 2
    board[0]![0] = 1
    board[0]![1] = 1
    board[0]![2] = 1
    board[1]![0] = 1
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect(move!.row).toBe(7)
    expect([6, 10]).toContain(move!.col)
  })
})
