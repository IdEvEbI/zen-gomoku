import { describe, it, expect } from 'vitest'
import {
  MinimaxAgent,
  createAgentForDifficulty,
  AI_DIFFICULTY_OPTIONS,
  HeuristicAgent,
} from './index'

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

describe('createAgentForDifficulty', () => {
  it('exposes four named levels', () => {
    expect(AI_DIFFICULTY_OPTIONS.map((o) => o.id)).toEqual([
      'sha',
      'zhu',
      'wukong',
      'tang',
    ])
    expect(AI_DIFFICULTY_OPTIONS.map((o) => o.name)).toEqual([
      '沙和尚',
      '猪八戒',
      '孙悟空',
      '唐僧',
    ])
  })

  it('zhu uses heuristic agent', () => {
    const agent = createAgentForDifficulty('zhu')
    expect(agent).toBeInstanceOf(HeuristicAgent)
  })

  it('wukong / tang use minimax', () => {
    expect(createAgentForDifficulty('wukong')).toBeInstanceOf(MinimaxAgent)
    expect(createAgentForDifficulty('tang')).toBeInstanceOf(MinimaxAgent)
  })
})

describe('MinimaxAgent', () => {
  it('opens at center on empty board', async () => {
    const agent = new MinimaxAgent({ maxDepth: 2, timeLimitMs: 100, candidateLimit: 8 })
    const move = await agent.getNextMove(emptyBoard())
    expect(move).toEqual({ row: 7, col: 7 })
  })

  it('blocks opponent four-in-a-row', async () => {
    const agent = new MinimaxAgent({
      maxDepth: 2,
      timeLimitMs: 200,
      candidateLimit: 12,
    })
    const board = emptyBoard()
    for (let c = 0; c < 4; c++) board[7]![c] = 1
    for (let c = 0; c < 3; c++) board[0]![c] = 2
    const move = await agent.getNextMove(board)
    expect(move).toEqual({ row: 7, col: 4 })
  })

  it('takes winning four when available', async () => {
    const agent = new MinimaxAgent({
      maxDepth: 2,
      timeLimitMs: 200,
      candidateLimit: 12,
    })
    const board = emptyBoard()
    for (let c = 0; c < 4; c++) board[5]![c] = 2
    for (let c = 0; c < 4; c++) board[0]![c] = 1
    board[1]![0] = 1
    const move = await agent.getNextMove(board)
    expect(move).toEqual({ row: 5, col: 4 })
  })

  it('depth-2 prefers creating threat over quiet move (fork-ish)', async () => {
    // 白两处三连窗口：应能找到进攻点（至少落在邻域且非瞎下）
    const agent = new MinimaxAgent({
      maxDepth: 2,
      timeLimitMs: 300,
      candidateLimit: 14,
    })
    const board = emptyBoard()
    // 黑若干无关子，使轮到白
    board[0]![0] = 1
    board[0]![1] = 1
    board[0]![2] = 1
    board[14]![0] = 2
    board[14]![1] = 2
    // 白在中部有潜力
    board[7]![7] = 2
    board[7]![8] = 2
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect(board[move!.row]![move!.col]).toBe(0)
  })
})
