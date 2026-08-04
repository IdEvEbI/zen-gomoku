/**
 * 赢法数组启发式 Agent（Phase 1 / 猪八戒）
 * - 开局偏中心
 * - 只对邻近已有子的空位打分（空盘除外）
 * - 进攻略重于防守；四连权重最高
 */

import type { IAgent, AiMove } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'
import { buildWinsTable, buildWinsCounts } from './winsTable'
import {
  scoreEmptyCell,
  listNeighborCandidates,
  DEFAULT_NEIGHBOR_RADIUS,
} from './evaluate'
import { RandomAgent } from './RandomAgent'

export class HeuristicAgent implements IAgent {
  readonly name = 'heuristic'
  private readonly boardSize: number
  private readonly wins: boolean[][][]
  private readonly winsCount: number
  private readonly fallback = new RandomAgent()

  constructor(boardSize = 15) {
    this.boardSize = boardSize
    const table = buildWinsTable(boardSize)
    this.wins = table.wins
    this.winsCount = table.winsCount
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
    const pool = listNeighborCandidates(board, DEFAULT_NEIGHBOR_RADIUS)

    let max = -1
    const best: AiMove[] = []

    for (const { row, col } of pool) {
      const total = scoreEmptyCell(
        row,
        col,
        player,
        selfCounts,
        oppCounts,
        this.wins,
        this.winsCount,
        this.boardSize
      )
      if (total > max) {
        max = total
        best.length = 0
        best.push({ row, col })
      } else if (total === max) {
        best.push({ row, col })
      }
    }

    if (best.length === 0 || max <= 0) {
      return this.fallback.getNextMove(board)
    }
    return best[Math.floor(Math.random() * best.length)] ?? null
  }
}
