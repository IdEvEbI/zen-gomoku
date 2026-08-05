/**
 * Minimax + Alpha-Beta
 * - 叶子用赢法启发评估
 * - 邻域候选 + 启发排序截断
 * - 可选迭代加深与硬时限（唐僧）
 */

import { checkWinner } from '../core'
import type { IAgent, AiMove, AiPlayer } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'
import { buildWinsTable } from './winsTable'
import {
  evaluateBoard,
  listOrderedCandidates,
  WIN_SCORE,
  DEFAULT_NEIGHBOR_RADIUS,
} from './evaluate'
import { RandomAgent } from './RandomAgent'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'

export interface MinimaxAgentOptions {
  /** 最大搜索深度（半步层数：1=只看一步） */
  maxDepth: number
  /** 硬时限（ms）；0 表示不限制 */
  timeLimitMs?: number
  /** 每层最多展开的候选数 */
  candidateLimit?: number
  neighborRadius?: number
  boardSize?: number
  /** 是否迭代加深（时限内尽量加深） */
  iterativeDeepening?: boolean
  name?: string
  rules?: RuleSetId
}

export class MinimaxAgent implements IAgent {
  readonly name: string
  private readonly maxDepth: number
  private readonly timeLimitMs: number
  private readonly candidateLimit: number
  private readonly neighborRadius: number
  private readonly iterativeDeepening: boolean
  private readonly boardSize: number
  private readonly rules: RuleSetId
  private readonly wins: boolean[][][]
  private readonly winsCount: number
  private readonly fallback: RandomAgent
  private deadline = 0
  private aborted = false

  constructor(options: MinimaxAgentOptions) {
    this.maxDepth = Math.max(1, options.maxDepth)
    this.timeLimitMs = options.timeLimitMs ?? 0
    this.candidateLimit = options.candidateLimit ?? 12
    this.neighborRadius = options.neighborRadius ?? DEFAULT_NEIGHBOR_RADIUS
    this.iterativeDeepening = options.iterativeDeepening ?? false
    this.boardSize = options.boardSize ?? 15
    this.rules = options.rules ?? DEFAULT_RULE_SET
    this.name = options.name ?? `minimax-d${this.maxDepth}`
    const table = buildWinsTable(this.boardSize)
    this.wins = table.wins
    this.winsCount = table.winsCount
    this.fallback = new RandomAgent(this.rules)
  }

  async getNextMove(board: number[][]): Promise<AiMove | null> {
    const empty = listEmptyCells(board)
    if (empty.length === 0) return null

    const aiPlayer = nextPlayerFromBoard(board)
    const stoneCount =
      empty.length === this.boardSize * this.boardSize
        ? 0
        : this.boardSize * this.boardSize - empty.length

    if (stoneCount === 0) {
      const mid = Math.floor(this.boardSize / 2)
      return { row: mid, col: mid }
    }

    this.deadline = this.timeLimitMs > 0 ? Date.now() + this.timeLimitMs : Number.POSITIVE_INFINITY
    this.aborted = false

    let best: AiMove | null = null

    const depths = this.iterativeDeepening
      ? Array.from({ length: this.maxDepth }, (_, i) => i + 1)
      : [this.maxDepth]

    for (const depth of depths) {
      if (this.timedOut()) break
      const result = this.searchRoot(board, aiPlayer, depth)
      if (result) best = result
      await Promise.resolve()
    }

    return best ?? this.fallback.getNextMove(board)
  }

  private timedOut(): boolean {
    if (Date.now() >= this.deadline) {
      this.aborted = true
      return true
    }
    return false
  }

  private searchRoot(board: number[][], aiPlayer: AiPlayer, depth: number): AiMove | null {
    const moves = listOrderedCandidates(
      board,
      aiPlayer,
      this.wins,
      this.winsCount,
      this.candidateLimit,
      this.neighborRadius,
      this.rules
    )
    if (moves.length === 0) return null

    let bestMove = moves[0]!
    let bestScore = -Infinity
    const tied: AiMove[] = []
    let alpha = -Infinity
    const beta = Infinity

    for (const move of moves) {
      if (this.timedOut()) break
      const next = cloneBoard(board)
      next[move.row]![move.col] = aiPlayer
      let score: number
      if (checkWinner(next, move.row, move.col, this.rules) === aiPlayer) {
        score = WIN_SCORE
      } else {
        score = this.minimax(next, depth - 1, alpha, beta, false, aiPlayer)
      }
      if (score > bestScore) {
        bestScore = score
        bestMove = move
        tied.length = 0
        tied.push(move)
      } else if (score === bestScore) {
        tied.push(move)
      }
      alpha = Math.max(alpha, bestScore)
      if (bestScore >= WIN_SCORE / 2) break
    }

    if (tied.length > 1) {
      return tied[Math.floor(Math.random() * tied.length)] ?? bestMove
    }
    return bestMove
  }

  private minimax(
    board: number[][],
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    aiPlayer: AiPlayer
  ): number {
    if (this.aborted || this.timedOut()) {
      return evaluateBoard(board, aiPlayer, this.wins, this.winsCount)
    }

    if (depth === 0) {
      return evaluateBoard(board, aiPlayer, this.wins, this.winsCount)
    }

    const player = nextPlayerFromBoard(board)
    const moves = listOrderedCandidates(
      board,
      player,
      this.wins,
      this.winsCount,
      this.candidateLimit,
      this.neighborRadius,
      this.rules
    )

    if (moves.length === 0) {
      return evaluateBoard(board, aiPlayer, this.wins, this.winsCount)
    }

    if (maximizing) {
      let value = -Infinity
      for (const move of moves) {
        if (this.timedOut()) break
        const next = cloneBoard(board)
        next[move.row]![move.col] = player
        const winner = checkWinner(next, move.row, move.col, this.rules)
        let score: number
        if (winner === aiPlayer) score = WIN_SCORE
        else if (winner !== null) score = -WIN_SCORE
        else {
          score = this.minimax(next, depth - 1, alpha, beta, false, aiPlayer)
        }
        value = Math.max(value, score)
        alpha = Math.max(alpha, value)
        if (beta <= alpha) break
      }
      return value
    }

    let value = Infinity
    for (const move of moves) {
      if (this.timedOut()) break
      const next = cloneBoard(board)
      next[move.row]![move.col] = player
      const winner = checkWinner(next, move.row, move.col, this.rules)
      let score: number
      if (winner === aiPlayer) score = WIN_SCORE
      else if (winner !== null) score = -WIN_SCORE
      else {
        score = this.minimax(next, depth - 1, alpha, beta, true, aiPlayer)
      }
      value = Math.min(value, score)
      beta = Math.min(beta, value)
      if (beta <= alpha) break
    }
    return value
  }
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => row.slice())
}
