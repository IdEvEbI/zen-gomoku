/**
 * 随机空位 Agent（接口占位 / 启发式无候选时的兜底）
 */

import type { IAgent, AiMove } from './types'
import { listEmptyCells } from './types'
import { filterLegalCandidates } from './evaluate'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'
import { nextPlayerFromBoard } from './types'

export class RandomAgent implements IAgent {
  readonly name = 'random'
  private readonly rules: RuleSetId

  constructor(rules: RuleSetId = DEFAULT_RULE_SET) {
    this.rules = rules
  }

  async getNextMove(board: number[][]): Promise<AiMove | null> {
    const player = nextPlayerFromBoard(board)
    const empty = filterLegalCandidates(board, listEmptyCells(board), player, this.rules)
    if (empty.length === 0) return null
    const i = Math.floor(Math.random() * empty.length)
    return empty[i] ?? null
  }
}
