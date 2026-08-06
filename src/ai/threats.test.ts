import { describe, it, expect } from 'vitest'
import {
  findWinningMoves,
  findFourThreatMoves,
  findOpenThreeMoves,
  findForkThreeMoves,
  listHardForcedReplies,
  listSoftDefenseCandidates,
  listSoftRootCandidates,
  listForcedReplies,
  pickBestForcedReply,
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

  it('fork at (9,5) is soft defense; set stays small', () => {
    const board = emptyBoard()
    apply(board, beforeWhite45)
    const forks = findForkThreeMoves(board, 1)
    expect(forks.some((m) => m.row === 9 && m.col === 5)).toBe(true)
    expect(listHardForcedReplies(board, 2)).toEqual([])
    const soft = listSoftDefenseCandidates(board, 2)
    expect(soft.some((m) => m.row === 9 && m.col === 5)).toBe(true)
    expect(soft.length).toBeLessThan(8)
  })

  it('after (9,5): soft open-four ends (6,5)/(10,5), exclude gap (5,5)', () => {
    const board = emptyBoard()
    apply(board, afterBlack95)
    expect(listHardForcedReplies(board, 2)).toEqual([])
    const soft = listSoftDefenseCandidates(board, 2)
    expect(soft.some((m) => m.row === 6 && m.col === 5)).toBe(true)
    expect(soft.some((m) => m.row === 10 && m.col === 5)).toBe(true)
    expect(soft.some((m) => m.row === 5 && m.col === 5)).toBe(false)
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
  }, 30_000)

  it('Tang reply is inside soft root set', async () => {
    const board = emptyBoard()
    apply(board, beforeWhite45)
    const agent = createAgentForDifficulty('tang')
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    const root = listSoftRootCandidates(board, 2)
    const soft = listSoftDefenseCandidates(board, 2)
    const ok =
      root.some((m) => m.row === move!.row && m.col === move!.col) ||
      soft.some((m) => m.row === move!.row && m.col === move!.col)
    expect(ok).toBe(true)
  })
})

describe('regression: zen-gomoku-2026-08-06-09-14-56 far move', () => {
  /** 黑 (6,4) 后存在活四必防；(13,11) 为随机废棋 */
  const afterBlack64: Array<[number, number, number]> = [
    [7, 7, 1],
    [6, 7, 2],
    [8, 6, 1],
    [4, 5, 2],
    [9, 5, 1],
    [6, 8, 2],
    [8, 5, 1],
    [8, 9, 2],
    [7, 5, 1],
    [6, 5, 2],
    [10, 4, 1],
    [11, 3, 2],
    [6, 4, 1],
  ]

  it('forced replies are open-four blocks near the fight', () => {
    const board = emptyBoard()
    apply(board, afterBlack64)
    const hard = listHardForcedReplies(board, 2)
    const soft = listSoftDefenseCandidates(board, 2)
    const forced = hard.length > 0 ? hard : soft
    expect(forced.some((m) => m.row === 5 && m.col === 3)).toBe(true)
    expect(forced.some((m) => m.row === 9 && m.col === 7)).toBe(true)
    expect(forced.some((m) => m.row === 13 && m.col === 11)).toBe(false)
  })

  it('Tang never plays far random; must block open four', async () => {
    const board = emptyBoard()
    apply(board, afterBlack64)
    const agent = createAgentForDifficulty('tang')
    for (let i = 0; i < 5; i++) {
      const move = await agent.getNextMove(board)
      expect(move).not.toBeNull()
      const ok = (move!.row === 5 && move!.col === 3) || (move!.row === 9 && move!.col === 7)
      expect(ok).toBe(true)
    }
  }, 20_000)
})

describe('regression: zen-gomoku-2026-08-06-09-25-18 double open-four', () => {
  const afterBlack84: Array<[number, number, number]> = [
    [7, 7, 1],
    [8, 7, 2],
    [6, 6, 1],
    [8, 8, 2],
    [6, 5, 1],
    [6, 7, 2],
    [7, 5, 1],
    [5, 7, 2],
    [9, 5, 1],
    [8, 5, 2],
    [8, 6, 1],
    [10, 4, 2],
    [6, 4, 1],
    [5, 3, 2],
    [8, 4, 1],
  ]

  it('(7,4) is a double open-four fork; soft set is forks only', () => {
    const board = emptyBoard()
    apply(board, afterBlack84)
    const forks = findForkThreeMoves(board, 1)
    expect(forks.some((m) => m.row === 7 && m.col === 4)).toBe(true)
    expect(listHardForcedReplies(board, 2)).toEqual([])
    const soft = listSoftDefenseCandidates(board, 2)
    expect(soft.some((m) => m.row === 7 && m.col === 4)).toBe(true)
    expect(soft.some((m) => m.row === 6 && m.col === 8)).toBe(false)
  })

  it('pickBestForcedReply prefers (7,3) over weak forks like (10,6)', () => {
    const board = emptyBoard()
    apply(board, afterBlack84)
    const soft = listSoftDefenseCandidates(board, 2)
    const best = pickBestForcedReply(board, 2, soft)
    expect(best).not.toBeNull()
    expect(best!.row).toBe(7)
    expect(best!.col).toBe(3)
  })

  it('Tang searches soft root (defense ∪ attack); never plays rush-only (6,8)', async () => {
    const board = emptyBoard()
    apply(board, afterBlack84)
    const root = listSoftRootCandidates(board, 2)
    const agent = createAgentForDifficulty('tang')
    for (let i = 0; i < 5; i++) {
      const move = await agent.getNextMove(board)
      expect(move).not.toBeNull()
      expect(move!.row === 6 && move!.col === 8).toBe(false)
      expect(root.some((m) => m.row === move!.row && m.col === move!.col)).toBe(true)
    }
  }, 30_000)
})

describe('regression: zen-gomoku-2026-08-06-09-42-16 dual-four fork', () => {
  const afterBlack85: Array<[number, number, number]> = [
    [7, 7, 1],
    [8, 8, 2],
    [8, 6, 1],
    [6, 8, 2],
    [9, 6, 1],
    [10, 6, 2],
    [9, 7, 1],
    [10, 8, 2],
    [9, 8, 1],
    [9, 9, 2],
    [7, 6, 1],
    [7, 8, 2],
    [8, 5, 1],
  ]

  it('(9,4) is a dual open-four kill; (10,7) is a weak fork block', () => {
    const board = emptyBoard()
    apply(board, afterBlack85)
    expect(findForkThreeMoves(board, 1).some((m) => m.row === 9 && m.col === 4)).toBe(true)
    expect(listHardForcedReplies(board, 2)).toEqual([])
    const soft = listSoftDefenseCandidates(board, 2)
    expect(soft.some((m) => m.row === 9 && m.col === 4)).toBe(true)
    expect(soft.some((m) => m.row === 10 && m.col === 7)).toBe(true)

    board[10]![7] = 2
    expect(findForkThreeMoves(board, 1).some((m) => m.row === 9 && m.col === 4)).toBe(true)
    board[10]![7] = 0

    board[6]![7] = 2
    expect(findForkThreeMoves(board, 1).some((m) => m.row === 9 && m.col === 4)).toBe(false)
  })

  it('pickBestForcedReply chooses (6,7), not weak (10,7)/(9,4)', () => {
    const board = emptyBoard()
    apply(board, afterBlack85)
    const best = pickBestForcedReply(board, 2, listSoftDefenseCandidates(board, 2))
    expect(best).toEqual({ row: 6, col: 7 })
  })

  it('soft root keeps defense and may include white attacks', () => {
    const board = emptyBoard()
    apply(board, afterBlack85)
    const soft = listSoftDefenseCandidates(board, 2)
    const root = listSoftRootCandidates(board, 2)
    expect(soft.every((s) => root.some((r) => r.row === s.row && r.col === s.col))).toBe(true)
    expect(root.length).toBeGreaterThanOrEqual(soft.length)
  })

  it('Tang search does not leave (9,4) dual-kill', async () => {
    const board = emptyBoard()
    apply(board, afterBlack85)
    const root = listSoftRootCandidates(board, 2)
    const agent = createAgentForDifficulty('tang')
    for (let i = 0; i < 5; i++) {
      const move = await agent.getNextMove(board)
      expect(move).not.toBeNull()
      expect(root.some((m) => m.row === move!.row && m.col === move!.col)).toBe(true)
      board[move!.row]![move!.col] = 2
      const stillKill = findForkThreeMoves(board, 1).some((m) => m.row === 9 && m.col === 4)
      board[move!.row]![move!.col] = 0
      expect(stillKill).toBe(false)
    }
  }, 30_000)
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
