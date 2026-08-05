import { describe, it, expect } from 'vitest'
import { OpeningBookController, expandOpeningSeeds, SEED_HUAYUE, SEED_TENGEN } from './openingBook'

describe('openingBook', () => {
  it('expandOpeningSeeds produces many symmetric lines', () => {
    const seeds = expandOpeningSeeds()
    expect(seeds.length).toBeGreaterThan(20)
    expect(seeds.some((s) => s.id === 'tengen')).toBe(true)
  })

  it('controller follows book then returns null off-book', () => {
    let i = 0
    const seq = [0.0, 0.1, 0.2]
    const book = new OpeningBookController([SEED_HUAYUE], () => seq[i++] ?? 0)
    book.reset()
    expect(book.getLine()?.[0]).toEqual({ r: 7, c: 7, player: 1 })

    const m1 = book.nextMove([], 1)
    expect(m1).toEqual({ row: 7, col: 7 })

    const m2 = book.nextMove([{ row: 7, col: 7, player: 1 }], 2)
    expect(m2).toEqual({ row: 7, col: 8 })

    const m3 = book.nextMove(
      [
        { row: 7, col: 7, player: 1 },
        { row: 7, col: 8, player: 2 },
      ],
      1
    )
    expect(m3).toEqual({ row: 6, col: 8 })

    const off = book.nextMove(
      [
        { row: 7, col: 7, player: 1 },
        { row: 0, col: 0, player: 2 },
      ],
      1
    )
    expect(off).toBeNull()
  })

  it('tengen-only line only suggests first move for black', () => {
    const book = new OpeningBookController([SEED_TENGEN], () => 0)
    book.reset()
    expect(book.nextMove([], 1)).toEqual({ row: 7, col: 7 })
    expect(book.nextMove([{ row: 7, col: 7, player: 1 }], 2)).toBeNull()
  })
})
