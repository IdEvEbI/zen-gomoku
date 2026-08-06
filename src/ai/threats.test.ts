import { describe, it, expect } from 'vitest'
import {
  findWinningMoves,
  findFourThreatMoves,
  findOpenThreeMoves,
  listForcedReplies,
  findForcedWinMove,
} from './threats'
import { MinimaxAgent } from './MinimaxAgent'
import { createAgentForDifficulty } from './difficulty'

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
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
    // white to move — black has 冲四/一步胜点
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
    // white stones so black to move? equal → black. Need open three CREATE move.
    // Already two; placing (8,8) makes three — may be open three if extensions work
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

  it('listForcedReplies: must answer open three', () => {
    const board = emptyBoard()
    board[7]![5] = 1
    board[7]![6] = 1
    board[7]![7] = 1
    // white to move
    board[0]![0] = 2
    board[0]![1] = 2
    board[0]![2] = 2
    const forced = listForcedReplies(board, 2)
    expect(forced.length).toBeGreaterThan(0)
    expect(forced.some((m) => (m.row === 7 && m.col === 4) || (m.row === 7 && m.col === 8))).toBe(
      true
    )
  })

  it('findForcedWinMove: live four forces win', () => {
    const board = emptyBoard()
    // 白三连，两端空 → 走一端成活四，再一手胜
    board[7]![7] = 2
    board[7]![8] = 2
    board[7]![9] = 2
    board[0]![0] = 1
    board[0]![1] = 1
    board[0]![2] = 1
    // black 3 white 3 → black to move; add black so white to move
    board[1]![0] = 1
    const move = findForcedWinMove(board, 2, 8)
    expect(move).not.toBeNull()
    expect(move!.row).toBe(7)
    expect([6, 10]).toContain(move!.col)
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
