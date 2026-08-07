/**
 * Minimax + Alpha-Beta
 * - 叶子：赢法启发 + 形分
 * - 根节点策略：`rootPolicy`（短路 / 软根对杀候选 / 防守底线）
 * - 唐僧：迭代加深 + VCF；时限内返回当前最佳
 */

import { checkWinner } from '../core'
import type { IAgent, AiMove, AiPlayer } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'
import { buildWinsTable } from './winsTable'
import {
  evaluateBoard,
  listNeighborCandidates,
  listOrderedCandidates,
  WIN_SCORE,
  DEFAULT_NEIGHBOR_RADIUS,
} from './evaluate'
import { listThreatCandidates } from './threats'
import { planRootPhase, resolveSearchWithDefenseFloor } from './rootPolicy'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'

export interface MinimaxAgentOptions {
  /** 最大搜索深度（半步层数：1=只看一步） */
  maxDepth: number
  /** 硬时限（ms）；0 表示不限制 */
  timeLimitMs?: number
  /** 每层最多展开的候选数（威胁点额外必留） */
  candidateLimit?: number
  neighborRadius?: number
  boardSize?: number
  /** 是否迭代加深（时限内尽量加深） */
  iterativeDeepening?: boolean
  /** 根节点 VCF 半步上限；0 关闭 */
  vcfMaxPly?: number
  /** VCF 最多占用的时限（ms）；0 表示不单独截断 */
  vcfBudgetMs?: number
  /** @deprecated 使用 vcfMaxPly */
  threatSearchPly?: number
  /** @deprecated 使用 vcfBudgetMs */
  threatSearchBudgetMs?: number
  /** 软威胁根候选上限（挡点 + 进攻） */
  softRootLimit?: number
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
  private readonly vcfMaxPly: number
  private readonly vcfBudgetMs: number
  private readonly softRootLimit: number
  private readonly boardSize: number
  private readonly rules: RuleSetId
  private readonly wins: boolean[][][]
  private readonly winsCount: number
  private deadline = 0
  private aborted = false

  constructor(options: MinimaxAgentOptions) {
    this.maxDepth = Math.max(1, options.maxDepth)
    this.timeLimitMs = options.timeLimitMs ?? 0
    this.candidateLimit = options.candidateLimit ?? 12
    this.neighborRadius = options.neighborRadius ?? DEFAULT_NEIGHBOR_RADIUS
    this.iterativeDeepening = options.iterativeDeepening ?? false
    this.vcfMaxPly = options.vcfMaxPly ?? options.threatSearchPly ?? 0
    this.vcfBudgetMs = options.vcfBudgetMs ?? options.threatSearchBudgetMs ?? 250
    this.softRootLimit = options.softRootLimit ?? 16
    this.boardSize = options.boardSize ?? 15
    this.rules = options.rules ?? DEFAULT_RULE_SET
    this.name = options.name ?? `minimax-d${this.maxDepth}`
    const table = buildWinsTable(this.boardSize)
    this.wins = table.wins
    this.winsCount = table.winsCount
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

    const work = board.map((row) => row.slice())

    const vcfBudgetEnd =
      this.vcfBudgetMs > 0 ? Math.min(this.deadline, Date.now() + this.vcfBudgetMs) : this.deadline

    const phase = planRootPhase(work, aiPlayer, {
      rules: this.rules,
      radius: this.neighborRadius,
      softRootLimit: this.softRootLimit,
      vcfMaxPly: this.vcfMaxPly,
      shouldAbortVcf: () => Date.now() >= vcfBudgetEnd || this.timedOut(),
    })

    if (phase.type === 'terminal') return phase.move

    let best: AiMove | null = null
    const depths = this.iterativeDeepening
      ? Array.from({ length: this.maxDepth }, (_, i) => i + 1)
      : [this.maxDepth]

    for (const depth of depths) {
      if (this.timedOut()) break
      const result = this.searchRoot(work, aiPlayer, depth, phase.restrict)
      if (result) best = result
      await Promise.resolve()
    }

    const resolved = resolveSearchWithDefenseFloor(
      work,
      aiPlayer,
      best,
      phase.defenseFloor,
      this.rules,
      this.neighborRadius
    )
    if (resolved) return resolved

    const near = listNeighborCandidates(work, this.neighborRadius, aiPlayer, this.rules)
    return near[0] ?? empty[0] ?? null
  }

  private timedOut(): boolean {
    if (Date.now() >= this.deadline) {
      this.aborted = true
      return true
    }
    return false
  }

  private candidatesFor(board: number[][], player: AiPlayer, restrict: AiMove[] | null): AiMove[] {
    if (restrict && restrict.length > 0) {
      return restrict.filter((m) => board[m.row]?.[m.col] === 0)
    }
    const threats = listThreatCandidates(board, player, this.rules, this.neighborRadius)
    return listOrderedCandidates(
      board,
      player,
      this.wins,
      this.winsCount,
      this.candidateLimit,
      this.neighborRadius,
      this.rules,
      threats
    )
  }

  private searchRoot(
    board: number[][],
    aiPlayer: AiPlayer,
    depth: number,
    restrict: AiMove[] | null
  ): AiMove | null {
    const moves = this.candidatesFor(board, aiPlayer, restrict)
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
      return evaluateBoard(board, aiPlayer, this.wins, this.winsCount, this.rules)
    }

    if (depth === 0) {
      return evaluateBoard(board, aiPlayer, this.wins, this.winsCount, this.rules)
    }

    const player = nextPlayerFromBoard(board)
    const moves = this.candidatesFor(board, player, null)

    if (moves.length === 0) {
      return evaluateBoard(board, aiPlayer, this.wins, this.winsCount, this.rules)
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
