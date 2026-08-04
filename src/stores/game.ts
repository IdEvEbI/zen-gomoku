/**
 * 对局状态与落子逻辑（Pinia）
 * 状态：board、currentPlayer、history、status
 * 落子前校验空位与当前玩家；非法落子不写 history，返回提示
 * 落子后调用胜负判定，若五连则更新 status
 * 支持棋谱导出 / 加载（JSON）与键值存储读写
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  checkWinner,
  toGameRecord,
  parseGameRecord,
  rebuildFromRecord,
  stringifyGameRecord,
  type GameRecord,
} from '../core'
import {
  DEFAULT_RECORD_STORAGE_KEY,
  type KeyValueStorage,
} from '../storage'

const BOARD_SIZE = 15

export type Player = 1 | 2
export type GameStatus = 'playing' | 'black_win' | 'white_win' | 'draw'

export interface HistoryEntry {
  row: number
  col: number
  player: Player
}

export type ActionResult =
  | { success: true }
  | { success: false; message: string }

function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))
}

export const useGameStore = defineStore('game', () => {
  const board = ref<number[][]>(createEmptyBoard())
  const currentPlayer = ref<Player>(1)
  const history = ref<HistoryEntry[]>([])
  const status = ref<GameStatus>('playing')

  const canPlay = computed(() => status.value === 'playing')

  /**
   * 落子：校验空位与当前玩家，合法则写入 history 并更新 board、切换玩家
   */
  function placeStone(row: number, col: number): ActionResult {
    if (status.value !== 'playing') {
      return { success: false, message: '对局已结束' }
    }
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return { success: false, message: '落子超出棋盘' }
    }
    const rowData = board.value[row]
    if (!rowData || rowData[col] !== 0) {
      return { success: false, message: '该位置已有棋子' }
    }
    const player = currentPlayer.value
    rowData[col] = player
    history.value.push({ row, col, player })
    const winner = checkWinner(board.value, row, col)
    if (winner !== null) {
      status.value = winner === 1 ? 'black_win' : 'white_win'
    } else {
      currentPlayer.value = (player === 1 ? 2 : 1) as Player
    }
    return { success: true }
  }

  function resetGame(): void {
    board.value = createEmptyBoard()
    currentPlayer.value = 1
    history.value = []
    status.value = 'playing'
  }

  /** 导出当前对局为棋谱对象 */
  function exportRecord(): GameRecord {
    return toGameRecord(history.value, {
      boardSize: BOARD_SIZE,
      status: status.value,
    })
  }

  /** 导出为 JSON 文本 */
  function exportRecordJson(): string {
    return stringifyGameRecord(exportRecord())
  }

  /** 从棋谱对象或 JSON 字符串恢复对局 */
  function loadRecord(input: unknown): ActionResult {
    const parsed = parseGameRecord(input)
    if (!parsed.ok) {
      return { success: false, message: parsed.message }
    }
    if (parsed.record.boardSize !== BOARD_SIZE) {
      return { success: false, message: `仅支持 ${BOARD_SIZE}×${BOARD_SIZE} 棋盘` }
    }
    const rebuilt = rebuildFromRecord(parsed.record)
    if ('error' in rebuilt) {
      return { success: false, message: rebuilt.error }
    }
    board.value = rebuilt.board
    history.value = rebuilt.history
    currentPlayer.value = rebuilt.currentPlayer
    status.value = rebuilt.status
    return { success: true }
  }

  /** 写入键值存储（如 localStorage） */
  function saveToStorage(
    storage: KeyValueStorage,
    key: string = DEFAULT_RECORD_STORAGE_KEY
  ): ActionResult {
    try {
      storage.setItem(key, exportRecordJson())
      return { success: true }
    } catch {
      return { success: false, message: '保存到本地存储失败' }
    }
  }

  /** 从键值存储读取并恢复 */
  function loadFromStorage(
    storage: KeyValueStorage,
    key: string = DEFAULT_RECORD_STORAGE_KEY
  ): ActionResult {
    const raw = storage.getItem(key)
    if (raw === null || raw === '') {
      return { success: false, message: '本地没有已保存的棋谱' }
    }
    return loadRecord(raw)
  }

  return {
    board,
    currentPlayer,
    history,
    status,
    canPlay,
    placeStone,
    resetGame,
    exportRecord,
    exportRecordJson,
    loadRecord,
    saveToStorage,
    loadFromStorage,
    boardSize: BOARD_SIZE,
  }
})
