/**
 * 赢法数组启发式 Agent（Phase 1 / 猪八戒）
 * - 开局偏中心
 * - 只对邻近已有子的空位打分（空盘除外）
 * - 一步胜 / listForcedReplies 必应；无紧急威胁时开局可略作变化
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
import { findWinningMoves, listForcedReplies, pickBestForcedReply } from './threats'
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

    const work = board.map((row) => row.slice())
    const winsNow = findWinningMoves(work, player, this.rules)
    if (winsNow.length > 0) {
      return winsNow[Math.floor(Math.random() * winsNow.length)]!
    }

    const forced = listForcedReplies(work, player, this.rules)
    if (forced.length > 0) {
      return (
        pickBestForcedReply(work, player, forced, this.rules) ??
        this.pickBestAmong(work, player, forced)
      )
    }

    const opp = (player === 1 ? 2 : 1) as 1 | 2
    const selfCounts = buildWinsCounts(work, this.wins, this.winsCount, player)
    const oppCounts = buildWinsCounts(work, this.wins, this.winsCount, opp)
    const pool = listNeighborCandidates(work, DEFAULT_NEIGHBOR_RADIUS, player, this.rules)

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
          this.boardSize,
          work,
          this.rules
        ),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)

    if (scored.length === 0) {
      return this.fallback.getNextMove(board)
    }

    const bestScore = scored[0]!.score

    if (bestScore >= URGENT_THREAT_SCORE) {
      const urgent = scored.filter((s) => s.score >= bestScore - 1e-6)
      return urgent[Math.floor(Math.random() * urgent.length)]!.move
    }

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

  private pickBestAmong(board: number[][], player: 1 | 2, moves: AiMove[]): AiMove {
    const opp = (player === 1 ? 2 : 1) as 1 | 2
    const selfCounts = buildWinsCounts(board, this.wins, this.winsCount, player)
    const oppCounts = buildWinsCounts(board, this.wins, this.winsCount, opp)
    let best = moves[0]!
    let bestScore = -Infinity
    const tied: AiMove[] = []
    for (const m of moves) {
      const score = scoreEmptyCell(
        m.row,
        m.col,
        player,
        selfCounts,
        oppCounts,
        this.wins,
        this.winsCount,
        this.boardSize,
        board,
        this.rules
      )
      if (score > bestScore) {
        bestScore = score
        best = m
        tied.length = 0
        tied.push(m)
      } else if (score === bestScore) {
        tied.push(m)
      }
    }
    return tied[Math.floor(Math.random() * tied.length)] ?? best
  }
}
