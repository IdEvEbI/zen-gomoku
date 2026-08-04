/**
 * 对局状态与落子逻辑（Pinia）
 * 状态：board、currentPlayer、history、status、displayHistoryIndex
 * 复盘：不修改 history，仅用 displayHistoryIndex 控制展示前 N 步
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  checkWinner,
  toGameRecord,
  parseGameRecord,
  rebuildFromRecord,
  stringifyGameRecord,
  boardFromHistory,
  type GameRecord,
} from '../core'
import {
  DEFAULT_RECORD_STORAGE_KEY,
  type KeyValueStorage,
} from '../storage'

const BOARD_SIZE = 15
/** 自动回放间隔（ms） */
export const REPLAY_INTERVAL_MS = 600

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
  /** 复盘展示手数：0…history.length；等于 length 表示当前完整局面 */
  const displayHistoryIndex = ref(0)
  /** 是否正在自动播放复盘 */
  const isReplayPlaying = ref(false)

  const isAtLiveEdge = computed(
    () => displayHistoryIndex.value >= history.value.length
  )

  /** 仅在对局进行中且视图停在最新一手时可落子 */
  const canPlay = computed(
    () => status.value === 'playing' && isAtLiveEdge.value
  )

  const canReplay = computed(() => history.value.length > 0)

  /** 供 Canvas 绘制：history 前 displayHistoryIndex 步 */
  const displayBoard = computed(() => {
    if (isAtLiveEdge.value) return board.value
    return boardFromHistory(history.value, displayHistoryIndex.value, BOARD_SIZE)
  })

  function clampDisplayIndex(index: number): number {
    return Math.max(0, Math.min(index, history.value.length))
  }

  function setDisplayIndex(index: number): void {
    displayHistoryIndex.value = clampDisplayIndex(index)
    if (displayHistoryIndex.value >= history.value.length) {
      isReplayPlaying.value = false
    }
  }

  function pauseReplay(): void {
    isReplayPlaying.value = false
  }

  function playReplay(): void {
    if (history.value.length === 0) return
    if (displayHistoryIndex.value >= history.value.length) {
      displayHistoryIndex.value = 0
    }
    isReplayPlaying.value = true
  }

  function toggleReplay(): void {
    if (isReplayPlaying.value) pauseReplay()
    else playReplay()
  }

  /** 自动播放时前进一步；已到末尾则暂停 */
  function tickReplay(): void {
    if (!isReplayPlaying.value) return
    if (displayHistoryIndex.value >= history.value.length) {
      isReplayPlaying.value = false
      return
    }
    displayHistoryIndex.value += 1
    if (displayHistoryIndex.value >= history.value.length) {
      isReplayPlaying.value = false
    }
  }

  function stepBack(): void {
    pauseReplay()
    setDisplayIndex(displayHistoryIndex.value - 1)
  }

  function stepForward(): void {
    pauseReplay()
    setDisplayIndex(displayHistoryIndex.value + 1)
  }

  function goToStart(): void {
    pauseReplay()
    setDisplayIndex(0)
  }

  function goToEnd(): void {
    pauseReplay()
    setDisplayIndex(history.value.length)
  }

  /**
   * 落子：校验空位与当前玩家，合法则写入 history 并更新 board、切换玩家
   */
  function placeStone(row: number, col: number): ActionResult {
    if (status.value !== 'playing') {
      return { success: false, message: '对局已结束' }
    }
    if (!isAtLiveEdge.value) {
      return { success: false, message: '请先回到最新局面再落子' }
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
    displayHistoryIndex.value = history.value.length
    const winner = checkWinner(board.value, row, col)
    if (winner !== null) {
      status.value = winner === 1 ? 'black_win' : 'white_win'
    } else {
      currentPlayer.value = (player === 1 ? 2 : 1) as Player
    }
    return { success: true }
  }

  function resetGame(): void {
    pauseReplay()
    board.value = createEmptyBoard()
    currentPlayer.value = 1
    history.value = []
    status.value = 'playing'
    displayHistoryIndex.value = 0
  }

  function exportRecord(): GameRecord {
    return toGameRecord(history.value, {
      boardSize: BOARD_SIZE,
      status: status.value,
    })
  }

  function exportRecordJson(): string {
    return stringifyGameRecord(exportRecord())
  }

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
    pauseReplay()
    board.value = rebuilt.board
    history.value = rebuilt.history
    currentPlayer.value = rebuilt.currentPlayer
    status.value = rebuilt.status
    displayHistoryIndex.value = history.value.length
    return { success: true }
  }

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
    displayBoard,
    currentPlayer,
    history,
    status,
    displayHistoryIndex,
    isReplayPlaying,
    isAtLiveEdge,
    canPlay,
    canReplay,
    placeStone,
    resetGame,
    exportRecord,
    exportRecordJson,
    loadRecord,
    saveToStorage,
    loadFromStorage,
    setDisplayIndex,
    stepBack,
    stepForward,
    goToStart,
    goToEnd,
    playReplay,
    pauseReplay,
    toggleReplay,
    tickReplay,
    boardSize: BOARD_SIZE,
  }
})
