import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseGameRecord, rebuildFromRecord } from '../core/gameRecord'
import { findVctMove } from './vct'

function recordToSiteCoord(r: number, c: number): string {
  return `${String.fromCharCode(97 + c)}${15 - r}`
}

interface Stone {
  r: number
  c: number
  player: 1 | 2
}

interface Puzzle {
  id: string
  expectTangHit: boolean
  acceptableMoves?: string[]
  toPlay?: 1 | 2
  stones?: Stone[]
  record?: string
}

interface Manifest {
  tangProfile: { maxPly: number; maxNodes: number }
  puzzles: Puzzle[]
}

const ROOT = path.resolve(__dirname, '../..')
const manifest = JSON.parse(
  readFileSync(path.join(ROOT, 'fixtures/records/vct/manifest.json'), 'utf8')
) as Manifest

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function loadBoard(puzzle: Puzzle): { board: number[][]; toPlay: 1 | 2 } {
  if (puzzle.stones && puzzle.toPlay) {
    const board = emptyBoard()
    for (const s of puzzle.stones) board[s.r]![s.c] = s.player
    return { board, toPlay: puzzle.toPlay }
  }
  if (!puzzle.record) throw new Error(`${puzzle.id}: missing board`)
  const raw = JSON.parse(readFileSync(path.join(ROOT, puzzle.record), 'utf8')) as unknown
  const parsed = parseGameRecord(raw)
  if (!parsed.ok) throw new Error(parsed.message)
  const rebuilt = rebuildFromRecord(parsed.record)
  if ('error' in rebuilt) throw new Error(rebuilt.error)
  return { board: rebuilt.board, toPlay: rebuilt.currentPlayer }
}

describe('vct puzzle bench (#83)', () => {
  it('manifest has short hits including gaojiti 220–222', () => {
    const hits = manifest.puzzles.filter((p) => p.expectTangHit)
    expect(hits.length).toBeGreaterThanOrEqual(3)
    expect(hits.some((p) => p.id === 'gaojiti-220')).toBe(true)
    expect(hits.some((p) => p.id === 'gaojiti-221')).toBe(true)
    expect(hits.some((p) => p.id === 'gaojiti-222')).toBe(true)
  })

  /**
   * CI：用节点帽（无墙钟）核对「期望命中」题，避免 400ms 时限抖动。
   * 墙钟档案以 `npm run verify:vct` 为准。
   */
  it.each(manifest.puzzles.filter((p) => p.expectTangHit))(
    'nodes-budget hit: $id',
    (puzzle) => {
      const { board, toPlay } = loadBoard(puzzle)
      const move = findVctMove(board, toPlay, {
        maxPly: manifest.tangProfile.maxPly,
        maxNodes: manifest.tangProfile.maxNodes,
      })
      expect(move).not.toBeNull()
      const site = recordToSiteCoord(move!.row, move!.col)
      const acceptable = puzzle.acceptableMoves ?? []
      if (acceptable.length > 0) {
        expect(acceptable).toContain(site)
      }
    },
    15_000
  )
})
