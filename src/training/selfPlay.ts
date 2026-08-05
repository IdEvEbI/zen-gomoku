/**
 * 无 UI 自对弈：双 Agent 互下，产出 GameRecord（供老师棋谱批量导出）
 */

import {
  checkWinner,
  toGameRecord,
  isLegalMove,
  DEFAULT_BOARD_SIZE,
  type GameRecord,
  type RecordStatus,
  type RuleSetId,
  type RecordMove,
} from '../core'
import type { IAgent, AiMove, AiPlayer } from '../ai'
import { listEmptyCells } from '../ai'
import { filterLegalCandidates } from '../ai/evaluate'

export type OpeningMode = 'random' | 'seed' | 'mixed'

export interface OpeningPlan {
  mode: OpeningMode
  /** random / mixed 时：天元之后再随机落子数（默认 2） */
  randomExtraMoves?: number
  /** seed / mixed 时可选的种子着法前缀 */
  seedMoves?: RecordMove[]
  /** mixed 时选用种子的概率，默认 0.5 */
  seedProbability?: number
}

export interface SelfPlayOptions {
  rules: RuleSetId
  blackAgent: IAgent
  whiteAgent: IAgent
  boardSize?: number
  opening?: OpeningPlan
  maxMoves?: number
  /** [0,1) 随机源，便于单测 */
  random?: () => number
}

function createEmptyBoard(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function pickRandomLegal(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId,
  random: () => number
): AiMove | null {
  const legal = filterLegalCandidates(board, listEmptyCells(board), player, rules)
  if (legal.length === 0) return null
  const idx = Math.floor(random() * legal.length)
  return legal[idx] ?? null
}

function tryPlace(
  board: number[][],
  history: { row: number; col: number; player: AiPlayer }[],
  row: number,
  col: number,
  player: AiPlayer,
  rules: RuleSetId,
  boardSize: number
): { ok: true; status: RecordStatus } | { ok: false; message: string } {
  if (!isLegalMove(board, row, col, player, rules)) {
    return { ok: false, message: '非法落子' }
  }
  board[row]![col] = player
  history.push({ row, col, player })
  const winner = checkWinner(board, row, col, rules)
  if (winner !== null) {
    return { ok: true, status: winner === 1 ? 'black_win' : 'white_win' }
  }
  if (history.length >= boardSize * boardSize) {
    return { ok: true, status: 'draw' }
  }
  return { ok: true, status: 'playing' }
}

function buildOpeningMoves(plan: OpeningPlan | undefined, random: () => number): RecordMove[] {
  if (!plan || plan.mode === 'random') {
    return [{ r: 7, c: 7, player: 1 }]
  }
  if (plan.mode === 'seed') {
    return plan.seedMoves?.length ? plan.seedMoves : [{ r: 7, c: 7, player: 1 }]
  }
  // mixed
  const p = plan.seedProbability ?? 0.5
  if (random() < p && plan.seedMoves?.length) {
    return plan.seedMoves
  }
  return [{ r: 7, c: 7, player: 1 }]
}

/**
 * 一局双 Agent 自对弈，返回完整棋谱。
 */
export async function playSelfPlayGame(options: SelfPlayOptions): Promise<GameRecord> {
  const boardSize = options.boardSize ?? DEFAULT_BOARD_SIZE
  const random = options.random ?? Math.random
  const maxMoves = options.maxMoves ?? boardSize * boardSize
  const board = createEmptyBoard(boardSize)
  const history: { row: number; col: number; player: AiPlayer }[] = []
  let status: RecordStatus = 'playing'
  let player: AiPlayer = 1

  const prefix = buildOpeningMoves(options.opening, random)
  for (const m of prefix) {
    if (status !== 'playing') break
    if (m.player !== player) {
      throw new Error(`开局种子行棋方错误：期望 ${player}，得到 ${m.player}`)
    }
    const placed = tryPlace(board, history, m.r, m.c, player, options.rules, boardSize)
    if (!placed.ok) {
      throw new Error(`开局种子无法落子 (${m.r},${m.c}): ${placed.message}`)
    }
    status = placed.status
    if (status === 'playing') {
      player = (player === 1 ? 2 : 1) as AiPlayer
    }
  }

  const extra =
    options.opening?.mode === 'seed' ? 0 : Math.max(0, options.opening?.randomExtraMoves ?? 2)
  for (let i = 0; i < extra && status === 'playing'; i++) {
    const move = pickRandomLegal(board, player, options.rules, random)
    if (!move) {
      status = 'draw'
      break
    }
    const placed = tryPlace(board, history, move.row, move.col, player, options.rules, boardSize)
    if (!placed.ok) {
      status = 'draw'
      break
    }
    status = placed.status
    if (status === 'playing') {
      player = (player === 1 ? 2 : 1) as AiPlayer
    }
  }

  while (status === 'playing' && history.length < maxMoves) {
    const agent = player === 1 ? options.blackAgent : options.whiteAgent
    const move = await agent.getNextMove(board.map((row) => row.slice()))
    if (!move) {
      status = 'draw'
      break
    }
    if (!isLegalMove(board, move.row, move.col, player, options.rules)) {
      // Agent 偶发非法点：改抽合法随机点，仍失败则和棋结束
      const fallback = pickRandomLegal(board, player, options.rules, random)
      if (!fallback) {
        status = 'draw'
        break
      }
      const placed = tryPlace(
        board,
        history,
        fallback.row,
        fallback.col,
        player,
        options.rules,
        boardSize
      )
      if (!placed.ok) {
        status = 'draw'
        break
      }
      status = placed.status
    } else {
      const placed = tryPlace(board, history, move.row, move.col, player, options.rules, boardSize)
      if (!placed.ok) {
        status = 'draw'
        break
      }
      status = placed.status
    }
    if (status === 'playing') {
      player = (player === 1 ? 2 : 1) as AiPlayer
    }
  }

  return toGameRecord(history, {
    boardSize,
    status,
    rules: options.rules,
  })
}
