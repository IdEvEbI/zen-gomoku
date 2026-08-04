/**
 * 棋谱：自定义 JSON 序列化 / 反序列化 / 从着法重建棋盘
 * 格式与 localStorage、文件导入导出共用，不依赖 DOM
 */

import { checkWinner } from './checkWinner'

export const GAME_RECORD_VERSION = 1
export const DEFAULT_BOARD_SIZE = 15

export type RecordPlayer = 1 | 2
export type RecordStatus = 'playing' | 'black_win' | 'white_win' | 'draw'

export interface RecordMove {
  r: number
  c: number
  player: RecordPlayer
}

/** 项目自定义棋谱 JSON */
export interface GameRecord {
  version: number
  boardSize: number
  moves: RecordMove[]
  /** 可选；缺省时由着法重算 */
  status?: RecordStatus
}

export interface RebuiltGameState {
  board: number[][]
  history: { row: number; col: number; player: RecordPlayer }[]
  currentPlayer: RecordPlayer
  status: RecordStatus
}

export type ParseRecordResult =
  | { ok: true; record: GameRecord }
  | { ok: false; message: string }

function createEmptyBoard(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function isPlayer(v: unknown): v is RecordPlayer {
  return v === 1 || v === 2
}

function isStatus(v: unknown): v is RecordStatus {
  return (
    v === 'playing' ||
    v === 'black_win' ||
    v === 'white_win' ||
    v === 'draw'
  )
}

/**
 * 将历史着法序列化为棋谱对象
 */
export function toGameRecord(
  history: { row: number; col: number; player: number }[],
  options?: { boardSize?: number; status?: RecordStatus }
): GameRecord {
  const boardSize = options?.boardSize ?? DEFAULT_BOARD_SIZE
  const moves: RecordMove[] = history.map((h) => ({
    r: h.row,
    c: h.col,
    player: (h.player === 2 ? 2 : 1) as RecordPlayer,
  }))
  const record: GameRecord = {
    version: GAME_RECORD_VERSION,
    boardSize,
    moves,
  }
  if (options?.status) {
    record.status = options.status
  }
  return record
}

/**
 * 解析并校验棋谱（对象或 JSON 字符串）
 */
export function parseGameRecord(input: unknown): ParseRecordResult {
  let data: unknown = input
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input) as unknown
    } catch {
      return { ok: false, message: '棋谱 JSON 无法解析' }
    }
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, message: '棋谱格式无效' }
  }
  const obj = data as Record<string, unknown>
  const version = obj.version
  if (typeof version !== 'number' || version < 1) {
    return { ok: false, message: '不支持的棋谱版本' }
  }
  const boardSize =
    typeof obj.boardSize === 'number' ? obj.boardSize : DEFAULT_BOARD_SIZE
  if (!Number.isInteger(boardSize) || boardSize < 5 || boardSize > 19) {
    return { ok: false, message: '棋盘尺寸无效' }
  }
  if (!Array.isArray(obj.moves)) {
    return { ok: false, message: '缺少 moves 数组' }
  }

  const moves: RecordMove[] = []
  for (let i = 0; i < obj.moves.length; i++) {
    const m = obj.moves[i]
    if (!m || typeof m !== 'object') {
      return { ok: false, message: `第 ${i + 1} 手格式无效` }
    }
    const move = m as Record<string, unknown>
    const r = move.r
    const c = move.c
    const player = move.player
    if (
      typeof r !== 'number' ||
      typeof c !== 'number' ||
      !Number.isInteger(r) ||
      !Number.isInteger(c) ||
      r < 0 ||
      r >= boardSize ||
      c < 0 ||
      c >= boardSize ||
      !isPlayer(player)
    ) {
      return { ok: false, message: `第 ${i + 1} 手坐标或玩家无效` }
    }
    moves.push({ r, c, player })
  }

  const record: GameRecord = {
    version,
    boardSize,
    moves,
  }
  if (obj.status !== undefined) {
    if (!isStatus(obj.status)) {
      return { ok: false, message: '对局状态无效' }
    }
    record.status = obj.status
  }
  return { ok: true, record }
}

/**
 * 从着法重建棋盘、历史、当前玩家与胜负状态
 */
export function rebuildFromRecord(record: GameRecord): RebuiltGameState | { error: string } {
  const size = record.boardSize
  const board = createEmptyBoard(size)
  const history: RebuiltGameState['history'] = []
  let status: RecordStatus = 'playing'
  let expected: RecordPlayer = 1

  for (let i = 0; i < record.moves.length; i++) {
    const move = record.moves[i]!
    if (status !== 'playing') {
      return { error: `第 ${i + 1} 手：对局已结束仍有着法` }
    }
    if (move.player !== expected) {
      return { error: `第 ${i + 1} 手：玩家顺序错误` }
    }
    const rowData = board[move.r]
    if (!rowData || rowData[move.c] !== 0) {
      return { error: `第 ${i + 1} 手：位置已被占用` }
    }
    rowData[move.c] = move.player
    history.push({ row: move.r, col: move.c, player: move.player })
    const winner = checkWinner(board, move.r, move.c)
    if (winner !== null) {
      status = winner === 1 ? 'black_win' : 'white_win'
    } else if (history.length >= size * size) {
      status = 'draw'
    } else {
      expected = expected === 1 ? 2 : 1
    }
  }

  const currentPlayer: RecordPlayer =
    status === 'playing' ? expected : history.length > 0 ? history[history.length - 1]!.player : 1

  // 若棋谱带 status，以重算为准（保证与 board 一致）；不一致则仍用重算结果
  return { board, history, currentPlayer, status }
}

export function stringifyGameRecord(record: GameRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`
}
