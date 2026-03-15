import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'

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

  it('placeStone: success updates board, history, and switches player', () => {
    const store = useGameStore()
    const r = store.placeStone(0, 0)
    expect(r.success).toBe(true)
    expect(store.board[0]![0]).toBe(1)
    expect(store.history).toHaveLength(1)
    expect(store.history[0]).toEqual({ row: 0, col: 0, player: 1 })
    expect(store.currentPlayer).toBe(2)

    const r2 = store.placeStone(1, 1)
    expect(r2.success).toBe(true)
    expect(store.board[1]![1]).toBe(2)
    expect(store.history).toHaveLength(2)
    expect(store.currentPlayer).toBe(1)
  })

  it('placeStone: reject duplicate move and do not push history', () => {
    const store = useGameStore()
    store.placeStone(0, 0)
    const len = store.history.length
    const result = store.placeStone(0, 0)
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
    store.placeStone(7, 0)
    store.placeStone(0, 0) // white
    store.placeStone(7, 1)
    store.placeStone(0, 1)
    store.placeStone(7, 2)
    store.placeStone(0, 2)
    store.placeStone(7, 3)
    store.placeStone(0, 3)
    store.placeStone(7, 4) // black fifth in a row
    expect(store.status).toBe('black_win')
    expect(store.canPlay).toBe(false)
  })

  it('resetGame: clears board, history, black first', () => {
    const store = useGameStore()
    store.placeStone(0, 0)
    store.placeStone(1, 1)
    store.resetGame()
    expect(store.board.every((row) => row.every((c) => c === 0))).toBe(true)
    expect(store.history).toHaveLength(0)
    expect(store.currentPlayer).toBe(1)
    expect(store.status).toBe('playing')
  })
})
