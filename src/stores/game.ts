/**
 * 对局状态与落子逻辑（Pinia）
 * 状态：board、currentPlayer、history、status
 * 落子前校验空位与当前玩家；非法落子不写 history，返回提示
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BOARD_SIZE = 15

export type Player = 1 | 2
export type GameStatus = 'playing' | 'black_win' | 'white_win' | 'draw'

export interface HistoryEntry {
  row: number
  col: number
  player: Player
}

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
   * @returns 成功返回 { success: true }，失败返回 { success: false, message }
   */
  function placeStone(row: number, col: number): { success: true } | { success: false; message: string } {
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
    currentPlayer.value = (player === 1 ? 2 : 1) as Player
    return { success: true }
  }

  /**
   * 重置对局：清空棋盘、历史，黑方先手，状态为 playing
   */
  function resetGame(): void {
    board.value = createEmptyBoard()
    currentPlayer.value = 1
    history.value = []
    status.value = 'playing'
  }

  return {
    board,
    currentPlayer,
    history,
    status,
    canPlay,
    placeStone,
    resetGame,
    boardSize: BOARD_SIZE,
  }
})
