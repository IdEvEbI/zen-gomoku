/**
 * 沙和尚：弱于纯启发，但不瞎下
 * - 从不在全盘随机空位落子（避免「弱智」体感）
 * - 一步胜 / listForcedReplies 必应
 * - 其余在启发 Top-K 中按权重抽样（偏最优，偶发次优）
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

export interface ShaHeshangOptions {
  /** 启发 Top-K（在非关键局面中抽样） */
  topK?: number
  /**
   * 选最优手的概率；其余概率在 Top-K 的第 2～K 名中均匀抽
   * 越大越接近猪八戒
   */
  bestMoveChance?: number
  boardSize?: number
  rules?: RuleSetId
}

export class ShaHeshangAgent implements IAgent {
  readonly name = 'sha-heshang'
  private readonly topK: number
  private readonly bestMoveChance: number
  private readonly boardSize: number
  private readonly rules: RuleSetId
  private readonly wins: boolean[][][]
  private readonly winsCount: number
  private readonly fallback: RandomAgent

  constructor(options: ShaHeshangOptions = {}) {
    this.topK = options.topK ?? 4
    this.bestMoveChance = options.bestMoveChance ?? 0.55
    this.boardSize = options.boardSize ?? 15
    this.rules = options.rules ?? DEFAULT_RULE_SET
    const table = buildWinsTable(this.boardSize)
    this.wins = table.wins
    this.winsCount = table.winsCount
    this.fallback = new RandomAgent(this.rules)
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

    const scored = pool.map((m) => ({
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
    scored.sort((a, b) => b.score - a.score)

    const top = scored.slice(0, Math.min(this.topK, scored.length))
    if (top.length === 0) return this.fallback.getNextMove(board)

    const best = top[0]!
    if (best.score >= URGENT_THREAT_SCORE) {
      const urgent = top.filter((s) => s.score >= best.score - 1e-6)
      return urgent[Math.floor(Math.random() * urgent.length)]!.move
    }

    if (top.length === 1 || Math.random() < this.bestMoveChance) {
      return best.move
    }

    const rest = top.slice(1)
    return rest[Math.floor(Math.random() * rest.length)]!.move
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
