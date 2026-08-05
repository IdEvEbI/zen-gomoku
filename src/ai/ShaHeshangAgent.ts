/**
 * 沙和尚：弱于纯启发，但不瞎下
 * - 从不在全盘随机空位落子（避免「弱智」体感）
 * - 必应冲四 / 堵四等高威胁
 * - 其余在启发 Top-K 中按权重抽样（偏最优，偶发次优）
 */

import type { IAgent, AiMove } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'
import { buildWinsTable, buildWinsCounts } from './winsTable'
import {
  scoreEmptyCell,
  listNeighborCandidates,
  DEFAULT_NEIGHBOR_RADIUS,
  OPPONENT_SCORE,
  SELF_SCORE,
} from './evaluate'
import { RandomAgent } from './RandomAgent'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'

/** 四连档启发分：必须应手，不允许「失误」 */
const CRITICAL_SCORE = Math.min(OPPONENT_SCORE[4]!, SELF_SCORE[4]!)

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

    const opp = (player === 1 ? 2 : 1) as 1 | 2
    const selfCounts = buildWinsCounts(board, this.wins, this.winsCount, player)
    const oppCounts = buildWinsCounts(board, this.wins, this.winsCount, opp)
    const pool = listNeighborCandidates(
      board,
      DEFAULT_NEIGHBOR_RADIUS,
      player,
      this.rules
    )

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
        this.boardSize
      ),
    }))
    scored.sort((a, b) => b.score - a.score)

    const top = scored.slice(0, Math.min(this.topK, scored.length))
    if (top.length === 0) return this.fallback.getNextMove(board)

    const best = top[0]!
    if (best.score >= CRITICAL_SCORE) {
      return best.move
    }

    if (top.length === 1 || Math.random() < this.bestMoveChance) {
      return best.move
    }

    const rest = top.slice(1)
    return rest[Math.floor(Math.random() * rest.length)]!.move
  }
}
