/**
 * Minimax + Alpha-Beta
 * - 叶子用赢法启发 + 形分评估
 * - 根节点：一步胜 / 硬必防短路；软防守（活三端·叉·冲四）限制搜索；其余威胁 DFS + αβ
 * - 可选短威胁 DFS（唐僧）与迭代加深硬时限
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
import {
  findForcedWinMove,
  findOpenFourMoves,
  findWinningMoves,
  listHardForcedReplies,
  listSoftDefenseCandidates,
  listThreatCandidates,
  pickBestForcedReply,
} from './threats'
import { RandomAgent } from './RandomAgent'
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
  /** 根节点短威胁 DFS 半步上限；0 关闭 */
  threatSearchPly?: number
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
  private readonly threatSearchPly: number
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
    this.threatSearchPly = options.threatSearchPly ?? 0
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

    const work = board.map((row) => row.slice())

    // 1) 己方一步胜
    const instant = findWinningMoves(work, aiPlayer, this.rules, this.neighborRadius)
    if (instant.length > 0) {
      return instant[Math.floor(Math.random() * instant.length)]!
    }

    // 2) 硬必防：对方下一步可胜（不可短路到软叉/活三）
    const hard = listHardForcedReplies(work, aiPlayer, this.rules, this.neighborRadius)
    if (hard.length > 0) {
      return hard[Math.floor(Math.random() * hard.length)]!
    }

    // 3) 己方活四抢攻
    const myOpenFours = findOpenFourMoves(work, aiPlayer, this.rules, this.neighborRadius)
    if (myOpenFours.length > 0) {
      return myOpenFours[Math.floor(Math.random() * myOpenFours.length)]!
    }

    // 4) 软防守（活三端 ∪ 叉 / 冲四）：限制根搜索，不跑威胁 DFS（防时限耗尽）
    const soft = listSoftDefenseCandidates(work, aiPlayer, this.rules, this.neighborRadius)
    if (soft.length > 0) {
      const rootRestrict = uniqueMoves([
        ...soft,
        ...findOpenFourMoves(work, aiPlayer, this.rules, this.neighborRadius),
      ])
      let best: AiMove | null = null
      const depths = this.iterativeDeepening
        ? Array.from({ length: this.maxDepth }, (_, i) => i + 1)
        : [this.maxDepth]
      for (const depth of depths) {
        if (this.timedOut()) break
        const result = this.searchRoot(work, aiPlayer, depth, rootRestrict)
        if (result) best = result
        await Promise.resolve()
      }
      return (
        best ??
        pickBestForcedReply(work, aiPlayer, soft, this.rules, this.neighborRadius) ??
        soft[0]!
      )
    }

    // 5) 无软威胁：短威胁 DFS + 全盘搜索
    if (this.threatSearchPly > 0) {
      const forced = findForcedWinMove(
        work,
        aiPlayer,
        this.threatSearchPly,
        this.rules,
        () => this.timedOut(),
        this.neighborRadius
      )
      if (forced) return forced
    }

    let best: AiMove | null = null
    const depths = this.iterativeDeepening
      ? Array.from({ length: this.maxDepth }, (_, i) => i + 1)
      : [this.maxDepth]

    for (const depth of depths) {
      if (this.timedOut()) break
      const result = this.searchRoot(work, aiPlayer, depth, null)
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
    const moves = this.candidatesFor(board, player)

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

function uniqueMoves(moves: AiMove[]): AiMove[] {
  const seen = new Set<string>()
  const out: AiMove[] = []
  for (const m of moves) {
    const k = `${m.row},${m.col}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(m)
  }
  return out
}
