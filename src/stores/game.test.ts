import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore, TENGEN_ROW, TENGEN_COL } from './game'

describe('useGameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initial state: empty board, black first, playing', () => {
    const store = useGameStore()
    expect(store.board.every((row) => row.every((c) => c === 0))).toBe(true)
    expect(store.currentPlayer).toBe(1)
    expect(store.history).toHaveLength(0)
    expect(store.status).toBe('playing')
    expect(store.canPlay).toBe(true)
  })

  it('placeStone: first move must be tengen', () => {
    const store = useGameStore()
    const bad = store.placeStone(0, 0)
    expect(bad.success).toBe(false)
    expect((bad as { message: string }).message).toBe('第一步请下在天元')
    expect(store.history).toHaveLength(0)

    const ok = store.placeStone(TENGEN_ROW, TENGEN_COL)
    expect(ok.success).toBe(true)
    expect(store.board[TENGEN_ROW]![TENGEN_COL]).toBe(1)
    expect(store.currentPlayer).toBe(2)
  })

  it('placeStone: success updates board, history, and switches player', () => {
    const store = useGameStore()
    const r = store.placeStone(TENGEN_ROW, TENGEN_COL)
    expect(r.success).toBe(true)
    expect(store.board[TENGEN_ROW]![TENGEN_COL]).toBe(1)
    expect(store.history).toHaveLength(1)
    expect(store.history[0]).toEqual({
      row: TENGEN_ROW,
      col: TENGEN_COL,
      player: 1,
    })
    expect(store.currentPlayer).toBe(2)

    const r2 = store.placeStone(1, 1)
    expect(r2.success).toBe(true)
    expect(store.board[1]![1]).toBe(2)
    expect(store.history).toHaveLength(2)
    expect(store.currentPlayer).toBe(1)
  })

  it('placeStone: reject duplicate move and do not push history', () => {
    const store = useGameStore()
    store.placeStone(TENGEN_ROW, TENGEN_COL)
    const len = store.history.length
    const result = store.placeStone(TENGEN_ROW, TENGEN_COL)
    expect(result.success).toBe(false)
    expect((result as { message: string }).message).toBe('该位置已有棋子')
    expect(store.history).toHaveLength(len)
  })

  it('placeStone: reject out of bounds', () => {
    const store = useGameStore()
    expect(store.placeStone(-1, 0).success).toBe(false)
    expect(store.placeStone(0, 15).success).toBe(false)
    expect(store.placeStone(15, 0).success).toBe(false)
    expect(store.history).toHaveLength(0)
  })

  it('placeStone: after five in a row updates status to black_win', () => {
    const store = useGameStore()
    // 天元开局后，在第 7 行向左连成五子：7,3..7,7
    store.placeStone(7, 7)
    store.placeStone(0, 0)
    store.placeStone(7, 6)
    store.placeStone(0, 1)
    store.placeStone(7, 5)
    store.placeStone(0, 2)
    store.placeStone(7, 4)
    store.placeStone(0, 3)
    store.placeStone(7, 3)
    expect(store.status).toBe('black_win')
    expect(store.canPlay).toBe(false)
  })

  it('resetGame: clears board, history, black first', () => {
    const store = useGameStore()
    store.placeStone(TENGEN_ROW, TENGEN_COL)
    store.placeStone(1, 1)
    store.resetGame()
    expect(store.board.every((row) => row.every((c) => c === 0))).toBe(true)
    expect(store.history).toHaveLength(0)
    expect(store.currentPlayer).toBe(1)
    expect(store.status).toBe('playing')
  })

  it('exportRecord / loadRecord round-trip', () => {
    const store = useGameStore()
    store.placeStone(7, 7)
    store.placeStone(0, 0)
    const json = store.exportRecordJson()
    store.resetGame()
    expect(store.history).toHaveLength(0)
    const result = store.loadRecord(json)
    expect(result.success).toBe(true)
    expect(store.board[7]![7]).toBe(1)
    expect(store.board[0]![0]).toBe(2)
    expect(store.history).toHaveLength(2)
    expect(store.currentPlayer).toBe(1)
  })

  it('saveToStorage / loadFromStorage via memory adapter', async () => {
    const { createMemoryStorage } = await import('../storage')
    const storage = createMemoryStorage()
    const store = useGameStore()
    store.placeStone(TENGEN_ROW, TENGEN_COL)
    expect(store.saveToStorage(storage).success).toBe(true)
    store.resetGame()
    expect(store.loadFromStorage(storage).success).toBe(true)
    expect(store.board[TENGEN_ROW]![TENGEN_COL]).toBe(1)
    expect(store.history).toHaveLength(1)
  })

  it('replay: stepBack/Forward does not mutate history', () => {
    const store = useGameStore()
    store.placeStone(TENGEN_ROW, TENGEN_COL)
    store.placeStone(1, 1)
    expect(store.displayHistoryIndex).toBe(2)
    store.stepBack()
    expect(store.displayHistoryIndex).toBe(1)
    expect(store.history).toHaveLength(2)
    expect(store.displayBoard[TENGEN_ROW]![TENGEN_COL]).toBe(1)
    expect(store.displayBoard[1]![1]).toBe(0)
    expect(store.canPlay).toBe(false)
    store.stepForward()
    expect(store.displayHistoryIndex).toBe(2)
    expect(store.displayBoard[1]![1]).toBe(2)
    expect(store.canPlay).toBe(true)
  })

  it('replay: placeStone rejected while scrubbing', () => {
    const store = useGameStore()
    store.placeStone(TENGEN_ROW, TENGEN_COL)
    store.placeStone(1, 1)
    store.goToStart()
    const result = store.placeStone(2, 2)
    expect(result.success).toBe(false)
    expect(store.history).toHaveLength(2)
  })

  it('replay: tickReplay advances and stops at end', () => {
    const store = useGameStore()
    store.placeStone(TENGEN_ROW, TENGEN_COL)
    store.placeStone(1, 1)
    store.goToStart()
    store.playReplay()
    expect(store.isReplayPlaying).toBe(true)
    store.tickReplay()
    expect(store.displayHistoryIndex).toBe(1)
    store.tickReplay()
    expect(store.displayHistoryIndex).toBe(2)
    expect(store.isReplayPlaying).toBe(false)
  })

  it('vsAi: after black move AI places white', async () => {
    vi.useFakeTimers()
    const store = useGameStore()
    store.setAgent({
      name: 'test',
      async getNextMove() {
        return { row: 1, col: 1 }
      },
    })
    store.setVsAi(true)
    expect(store.placeStone(TENGEN_ROW, TENGEN_COL).success).toBe(true)
    expect(store.aiThinking).toBe(true)
    await vi.advanceTimersByTimeAsync(300)
    await Promise.resolve()
    expect(store.board[1]![1]).toBe(2)
    expect(store.currentPlayer).toBe(1)
    expect(store.aiThinking).toBe(false)
    vi.useRealTimers()
  })

  it('vsAi AI first: AI places tengen as black', async () => {
    vi.useFakeTimers()
    const store = useGameStore()
    store.setAgent({
      name: 'test',
      async getNextMove(board) {
        // 空盘应下天元；此处直接返回天元验证接线
        void board
        return { row: TENGEN_ROW, col: TENGEN_COL }
      },
    })
    store.setHumanFirst(false)
    store.setVsAi(true)
    expect(store.aiPlayer).toBe(1)
    expect(store.canPlay).toBe(false)
    expect(store.aiThinking).toBe(true)
    await vi.advanceTimersByTimeAsync(300)
    await Promise.resolve()
    expect(store.board[TENGEN_ROW]![TENGEN_COL]).toBe(1)
    expect(store.currentPlayer).toBe(2)
    expect(store.canPlay).toBe(true)
    vi.useRealTimers()
  })

  it('setAiDifficulty updates level id', () => {
    const store = useGameStore()
    expect(store.aiDifficulty).toBe('zhu')
    store.setAiDifficulty('wukong')
    expect(store.aiDifficulty).toBe('wukong')
    store.setAiDifficulty('tang')
    expect(store.aiDifficulty).toBe('tang')
  })
})
