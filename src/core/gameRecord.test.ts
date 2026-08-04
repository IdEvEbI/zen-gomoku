import { describe, it, expect } from 'vitest'
import {
  toGameRecord,
  parseGameRecord,
  rebuildFromRecord,
  stringifyGameRecord,
  GAME_RECORD_VERSION,
} from './gameRecord'

describe('gameRecord', () => {
  it('toGameRecord maps history to moves', () => {
    const record = toGameRecord(
      [
        { row: 7, col: 7, player: 1 },
        { row: 7, col: 8, player: 2 },
      ],
      { status: 'playing' }
    )
    expect(record.version).toBe(GAME_RECORD_VERSION)
    expect(record.boardSize).toBe(15)
    expect(record.moves).toEqual([
      { r: 7, c: 7, player: 1 },
      { r: 7, c: 8, player: 2 },
    ])
    expect(record.status).toBe('playing')
  })

  it('parseGameRecord accepts JSON string and object', () => {
    const raw = {
      version: 1,
      boardSize: 15,
      moves: [{ r: 0, c: 0, player: 1 }],
    }
    expect(parseGameRecord(raw).ok).toBe(true)
    expect(parseGameRecord(JSON.stringify(raw)).ok).toBe(true)
  })

  it('parseGameRecord rejects invalid moves', () => {
    const bad = parseGameRecord({
      version: 1,
      boardSize: 15,
      moves: [{ r: 99, c: 0, player: 1 }],
    })
    expect(bad.ok).toBe(false)
  })

  it('rebuildFromRecord restores board and switches player', () => {
    const parsed = parseGameRecord({
      version: 1,
      boardSize: 15,
      moves: [
        { r: 7, c: 7, player: 1 },
        { r: 0, c: 0, player: 2 },
      ],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const rebuilt = rebuildFromRecord(parsed.record)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    expect(rebuilt.board[7]![7]).toBe(1)
    expect(rebuilt.board[0]![0]).toBe(2)
    expect(rebuilt.currentPlayer).toBe(1)
    expect(rebuilt.status).toBe('playing')
    expect(rebuilt.history).toHaveLength(2)
  })

  it('rebuildFromRecord detects black win', () => {
    const moves = []
    for (let i = 0; i < 5; i++) {
      moves.push({ r: 7, c: i, player: 1 as const })
      if (i < 4) moves.push({ r: 0, c: i, player: 2 as const })
    }
    const parsed = parseGameRecord({ version: 1, boardSize: 15, moves })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const rebuilt = rebuildFromRecord(parsed.record)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    expect(rebuilt.status).toBe('black_win')
  })

  it('round-trip stringify → parse', () => {
    const record = toGameRecord([{ row: 1, col: 2, player: 1 }])
    const text = stringifyGameRecord(record)
    const parsed = parseGameRecord(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.record.moves).toEqual(record.moves)
  })
})
