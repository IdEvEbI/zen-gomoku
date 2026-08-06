/**
 * 赢法数组启发式 Agent（Phase 1 / 猪八戒）
 * - 开局偏中心
 * - 只对邻近已有子的空位打分（空盘除外）
 * - 活三及以上必须应手；无紧急威胁时开局可在同分附近略作变化
 */

import type { IAgent, AiMove } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'
import { buildWinsTable, buildWinsCounts } from './winsTable'
import {
  scoreEmptyCell,
  listNeighborCandidates,
  DEFAULT_NEIGHBOR_RADIUS,
  URGENT_THREAT_SCORE,
} from './evaluate'
import { RandomAgent } from './RandomAgent'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'

export class HeuristicAgent implements IAgent {
  readonly name = 'heuristic'
  private readonly boardSize: number
  private readonly rules: RuleSetId
  private readonly wins: boolean[][][]
  private readonly winsCount: number
  private readonly fallback: RandomAgent

  constructor(boardSize = 15, rules: RuleSetId = DEFAULT_RULE_SET) {
    this.boardSize = boardSize
    this.rules = rules
    const table = buildWinsTable(boardSize)
    this.wins = table.wins
    this.winsCount = table.winsCount
    this.fallback = new RandomAgent(rules)
  }

  async getNextMove(board: number[][]): Promise<AiMove | null> {
    const empty = listEmptyCells(board)
    if (empty.length === 0) return null

    const player = nextPlayerFromBoard(board)
    const stoneCount =
      empty.length === this.boardSize * this.boardSize
        ? 0
        : this.boardSize * this.boardSize - empty.length

    if (stoneCount === 0) {
      const mid = Math.floor(this.boardSize / 2)
      return { row: mid, col: mid }
    }

    const opp = (player === 1 ? 2 : 1) as 1 | 2
    const selfCounts = buildWinsCounts(board, this.wins, this.winsCount, player)
    const oppCounts = buildWinsCounts(board, this.wins, this.winsCount, opp)
    const pool = listNeighborCandidates(board, DEFAULT_NEIGHBOR_RADIUS, player, this.rules)

    const scored = pool
      .map((m) => ({
        move: m,
        score: scoreEmptyCell(
          m.row,
          m.col,
          player,
          selfCounts,
          oppCounts,
          this.wins,
          this.winsCount,
          this.boardSize
        ),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)

    if (scored.length === 0) {
      return this.fallback.getNextMove(board)
    }

    const bestScore = scored[0]!.score

    // 活三/冲四等紧急威胁：必须走最高分（可同分随机）
    if (bestScore >= URGENT_THREAT_SCORE) {
      const urgent = scored.filter((s) => s.score >= bestScore - 1e-6)
      return urgent[Math.floor(Math.random() * urgent.length)]!.move
    }

    // 开局无紧急手：仅在「接近最优」的候选里抽样，避免漏应又保持变化
    if (stoneCount < 8) {
      const nearBest = scored.filter((s) => s.score >= bestScore - 40)
      const pick = nearBest.slice(0, Math.min(3, nearBest.length))
      if (pick.length > 0) {
        return pick[Math.floor(Math.random() * pick.length)]!.move
      }
    }

    const tied = scored.filter((s) => s.score >= bestScore - 1e-6)
    return tied[Math.floor(Math.random() * tied.length)]!.move
  }
}
