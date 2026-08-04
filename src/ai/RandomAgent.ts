/**
 * 随机空位 Agent（接口占位 / 启发式无候选时的兜底）
 */

import type { IAgent, AiMove } from './types'
import { listEmptyCells } from './types'

export class RandomAgent implements IAgent {
  readonly name = 'random'

  async getNextMove(board: number[][]): Promise<AiMove | null> {
    const empty = listEmptyCells(board)
    if (empty.length === 0) return null
    const i = Math.floor(Math.random() * empty.length)
    return empty[i] ?? null
  }
}
