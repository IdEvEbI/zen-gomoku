import { describe, it, expect } from 'vitest'
import { pointerEventToLogical } from './pointerMapper.ts'
import { BOARD_SIZE } from './coordMapper.ts'

const scale = 28
const bitmapSize = BOARD_SIZE * scale
const offset = scale / 2

function mockCanvas(displaySize: number, bitmap = bitmapSize): HTMLCanvasElement {
  return {
    width: bitmap,
    height: bitmap,
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      width: displaySize,
      height: displaySize,
      right: 10 + displaySize,
      bottom: 20 + displaySize,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    }),
  } as HTMLCanvasElement
}

describe('pointerEventToLogical', () => {
  it('maps mouse-like client coords to (0,0) via display→bitmap', () => {
    const canvas = mockCanvas(bitmapSize)
    // 交点 (0,0) 在位图上为 (offset, offset)；1:1 显示时 client = left+offset, top+offset
    const point = pointerEventToLogical(10 + offset, 20 + offset, canvas, scale)
    expect(point).toEqual({ row: 0, col: 0 })
  })

  it('maps center intersection (7,7)', () => {
    const canvas = mockCanvas(bitmapSize)
    const x = 10 + offset + 7 * scale
    const y = 20 + offset + 7 * scale
    expect(pointerEventToLogical(x, y, canvas, scale)).toEqual({ row: 7, col: 7 })
  })

  it('handles CSS-scaled canvas (display ≠ bitmap)', () => {
    const displaySize = bitmapSize / 2
    const canvas = mockCanvas(displaySize)
    // 显示坐标在交点 (7,7)：位图坐标 / 2
    const displayX = (offset + 7 * scale) / 2
    const displayY = (offset + 7 * scale) / 2
    expect(
      pointerEventToLogical(10 + displayX, 20 + displayY, canvas, scale)
    ).toEqual({ row: 7, col: 7 })
  })

  it('returns null when pointer is outside canvas', () => {
    const canvas = mockCanvas(bitmapSize)
    expect(pointerEventToLogical(5, 20, canvas, scale)).toBeNull()
    expect(pointerEventToLogical(10, 5, canvas, scale)).toBeNull()
    expect(
      pointerEventToLogical(10 + bitmapSize + 1, 20 + offset, canvas, scale)
    ).toBeNull()
  })

  it('returns null when scale is invalid', () => {
    const canvas = mockCanvas(bitmapSize)
    expect(pointerEventToLogical(10 + offset, 20 + offset, canvas, 0)).toBeNull()
    expect(pointerEventToLogical(10 + offset, 20 + offset, canvas, -1)).toBeNull()
  })

  it('returns null when canvas bitmap size is 0', () => {
    const canvas = mockCanvas(100, 0)
    expect(pointerEventToLogical(50, 50, canvas, scale)).toBeNull()
  })
})
