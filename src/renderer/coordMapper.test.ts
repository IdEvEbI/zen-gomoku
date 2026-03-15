import { describe, it, expect } from 'vitest'
import { createCoordMapper, BOARD_SIZE } from './coordMapper.ts'

const scale = 28
const offset = scale / 2

describe('createCoordMapper', () => {
  it('uses BOARD_SIZE 15', () => {
    expect(BOARD_SIZE).toBe(15)
  })

  describe('logicalToPixel', () => {
    it('returns pixel position of intersection (0,0) with offset', () => {
      const mapper = createCoordMapper(scale)
      expect(mapper.logicalToPixel(0, 0)).toEqual({ x: offset, y: offset })
    })

    it('returns pixel position of intersection (14,14)', () => {
      const mapper = createCoordMapper(scale)
      expect(mapper.logicalToPixel(14, 14)).toEqual({
        x: offset + 14 * scale,
        y: offset + 14 * scale,
      })
    })

    it('returns pixel position of intersection (7,7)', () => {
      const mapper = createCoordMapper(scale)
      expect(mapper.logicalToPixel(7, 7)).toEqual({
        x: offset + 7 * scale,
        y: offset + 7 * scale,
      })
    })
  })

  describe('pixelToLogical', () => {
    it('maps center of (0,0) intersection to (0,0)', () => {
      const mapper = createCoordMapper(scale)
      expect(mapper.pixelToLogical(offset, offset)).toEqual({ row: 0, col: 0 })
    })

    it('maps pixel at (14,14) intersection to (14,14)', () => {
      const mapper = createCoordMapper(scale)
      const x = offset + 14 * scale
      const y = offset + 14 * scale
      expect(mapper.pixelToLogical(x, y)).toEqual({ row: 14, col: 14 })
    })

    it('rounds to nearest intersection', () => {
      const mapper = createCoordMapper(scale)
      expect(
        mapper.pixelToLogical(
          offset + 7.4 * scale,
          offset + 7.4 * scale
        )
      ).toEqual({ row: 7, col: 7 })
      expect(
        mapper.pixelToLogical(
          offset + 7.6 * scale,
          offset + 7.6 * scale
        )
      ).toEqual({ row: 8, col: 8 })
    })

    it('returns null when out of board (negative)', () => {
      const mapper = createCoordMapper(scale)
      expect(mapper.pixelToLogical(-scale, -scale)).toBeNull()
      expect(mapper.pixelToLogical(offset - 1, -1)).toBeNull()
    })

    it('returns null when out of board (>= BOARD_SIZE)', () => {
      const mapper = createCoordMapper(scale)
      const out = 15 * scale
      expect(mapper.pixelToLogical(out, 0)).toBeNull()
      expect(mapper.pixelToLogical(0, out)).toBeNull()
      expect(mapper.pixelToLogical(out, out)).toBeNull()
    })

    it('accepts pixel at (14,14) intersection', () => {
      const mapper = createCoordMapper(scale)
      expect(
        mapper.pixelToLogical(
          offset + 14 * scale,
          offset + 14 * scale
        )
      ).toEqual({ row: 14, col: 14 })
    })
  })

  describe('round-trip logicalToPixel then pixelToLogical', () => {
    it('preserves (row,col) for all valid intersections', () => {
      const mapper = createCoordMapper(scale)
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const { x, y } = mapper.logicalToPixel(row, col)
          const back = mapper.pixelToLogical(x, y)
          expect(back).toEqual({ row, col })
        }
      }
    })
  })

  describe('getScale / getOffset / getSize', () => {
    it('returns scale, offset and size', () => {
      const mapper = createCoordMapper(scale)
      expect(mapper.getScale()).toBe(scale)
      expect(mapper.getOffset()).toBe(offset)
      expect(mapper.getSize()).toBe(BOARD_SIZE * scale)
    })
  })
})
