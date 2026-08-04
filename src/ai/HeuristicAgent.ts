/**
 * 赢法数组启发式 Agent（Phase 1）
 * - 开局偏中心
 * - 只对邻近已有子的空位打分（空盘除外）
 * - 进攻略重于防守；四连权重最高
 */

import type { IAgent, AiMove } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'
import { buildWinsTable, buildWinsCounts } from './winsTable'
import { RandomAgent } from './RandomAgent'

const OPPONENT_SCORE = [0, 200, 400, 2000, 10000] as const
const SELF_SCORE = [0, 220, 420, 2400, 20000] as const
const NEIGHBOR_RADIUS = 2
const CENTER_BONUS = 50

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
    const stoneCount = empty.length === this.boardSize * this.boardSize ? 0 : this.boardSize * this.boardSize - empty.length

    // 开局：天元
    if (stoneCount === 0) {
      const mid = Math.floor(this.boardSize / 2)
      return { row: mid, col: mid }
    }

    const selfCounts = buildWinsCounts(board, this.wins, this.winsCount, player)
    const opp = (player === 1 ? 2 : 1) as 1 | 2
    const oppCounts = buildWinsCounts(board, this.wins, this.winsCount, opp)

    const candidates =
      stoneCount <= 2 ? empty : empty.filter((m) => this.hasNeighbor(board, m.row, m.col))
    const pool = candidates.length > 0 ? candidates : empty

    let max = -1
    const best: AiMove[] = []

    for (const { row, col } of pool) {
      let selfScore = 0
      let oppScore = 0
      for (let k = 0; k < this.winsCount; k++) {
        if (!this.wins[row]?.[col]?.[k]) continue
        const oc = oppCounts[k] ?? 0
        const sc = selfCounts[k] ?? 0
        if (oc > 0 && oc <= 4) oppScore += OPPONENT_SCORE[oc]!
        if (sc > 0 && sc <= 4) selfScore += SELF_SCORE[sc]!
      }
      // 中心偏好（弱）
      const mid = (this.boardSize - 1) / 2
      const dist = Math.abs(row - mid) + Math.abs(col - mid)
      const center = Math.max(0, CENTER_BONUS - dist * 3)
      const total = Math.max(selfScore, oppScore) + center

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

  private hasNeighbor(board: number[][], row: number, col: number): boolean {
    const size = board.length
    for (let dr = -NEIGHBOR_RADIUS; dr <= NEIGHBOR_RADIUS; dr++) {
      for (let dc = -NEIGHBOR_RADIUS; dc <= NEIGHBOR_RADIUS; dc++) {
        if (dr === 0 && dc === 0) continue
        const r = row + dr
        const c = col + dc
        if (r < 0 || c < 0 || r >= size || c >= size) continue
        const v = board[r]?.[c]
        if (v === 1 || v === 2) return true
      }
    }
    return false
  }
}
