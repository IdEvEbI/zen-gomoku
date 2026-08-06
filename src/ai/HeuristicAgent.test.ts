import { describe, it, expect } from 'vitest'
import { HeuristicAgent, RandomAgent, nextPlayerFromBoard, buildWinsTable } from './index'

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

describe('nextPlayerFromBoard', () => {
  it('empty board → black', () => {
    expect(nextPlayerFromBoard(emptyBoard())).toBe(1)
  })

  it('after one black → white', () => {
    const b = emptyBoard()
    b[7]![7] = 1
    expect(nextPlayerFromBoard(b)).toBe(2)
  })
})

describe('buildWinsTable', () => {
  it('creates many win lines for 15×15', () => {
    const { winsCount } = buildWinsTable(15)
    expect(winsCount).toBeGreaterThan(500)
  })
})

describe('RandomAgent', () => {
  it('returns an empty cell', async () => {
    const agent = new RandomAgent()
    const board = emptyBoard()
    board[0]![0] = 1
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect(board[move!.row]![move!.col]).toBe(0)
  })

  it('returns null when board full', async () => {
    const agent = new RandomAgent()
    const board = emptyBoard(3).map((row) => row.map(() => 1))
    expect(await agent.getNextMove(board)).toBeNull()
  })
})

describe('HeuristicAgent', () => {
  it('opens at center on empty board', async () => {
    const agent = new HeuristicAgent(15)
    const move = await agent.getNextMove(emptyBoard())
    expect(move).toEqual({ row: 7, col: 7 })
  })

  it('blocks opponent four-in-a-row threat', async () => {
    const agent = new HeuristicAgent(15)
    const board = emptyBoard()
    // 黑在 (7,0..3) 四连，白应走 (7,4) 或 (7,-1) 即 (7,4)
    // 轮到白：黑 4 子，白 3 子
    for (let c = 0; c < 4; c++) board[7]![c] = 1
    for (let c = 0; c < 3; c++) board[0]![c] = 2
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect(move!.row).toBe(7)
    expect(move!.col).toBe(4)
  })

  it('takes winning four when available', async () => {
    const agent = new HeuristicAgent(15)
    const board = emptyBoard()
    // 白四连待冲，轮到白
    for (let c = 0; c < 4; c++) board[5]![c] = 2
    for (let c = 0; c < 4; c++) board[0]![c] = 1
    // black 4, white 4 → next is black (equal)? black=4 white=4 → black to move
    // need white to move: black should have one more
    board[1]![0] = 1 // black 5, white 4 → white to move
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect(move!.row).toBe(5)
    expect(move!.col).toBe(4)
  })

  it('blocks open three on diagonal (must not soft-random away)', async () => {
    const agent = new HeuristicAgent(15)
    // 黑斜向活三 (6,6)(7,7)(8,8)，两端 (5,5)/(9,9)；白应堵其一
    // 子数 7 < 8，曾触发软随机漏堵
    const board = emptyBoard()
    board[6]![6] = 1
    board[7]![7] = 1
    board[8]![8] = 1
    board[0]![0] = 2
    board[0]![1] = 2
    board[0]![2] = 2
    board[1]![0] = 1 // black 4, white 3 → white to move
    for (let i = 0; i < 20; i++) {
      const move = await agent.getNextMove(board)
      expect(move).not.toBeNull()
      const end = (move!.row === 5 && move!.col === 5) || (move!.row === 9 && move!.col === 9)
      expect(end).toBe(true)
    }
  })
})

describe('ShaHeshangAgent', () => {
  it('always blocks open three (never misses for variety)', async () => {
    const { ShaHeshangAgent } = await import('./ShaHeshangAgent')
    const agent = new ShaHeshangAgent({ bestMoveChance: 0.1 })
    const board = emptyBoard()
    board[6]![6] = 1
    board[7]![7] = 1
    board[8]![8] = 1
    board[0]![0] = 2
    board[0]![1] = 2
    board[0]![2] = 2
    board[1]![0] = 1
    for (let i = 0; i < 30; i++) {
      const move = await agent.getNextMove(board)
      expect(move).not.toBeNull()
      const end = (move!.row === 5 && move!.col === 5) || (move!.row === 9 && move!.col === 9)
      expect(end).toBe(true)
    }
  })
})
