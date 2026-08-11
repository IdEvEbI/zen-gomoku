import { describe, it, expect } from 'vitest'
import { pointerEventToLogical } from './pointerMapper.ts'
import { BOARD_SIZE } from './coordMapper.ts'

const scale = 28
const cssSize = BOARD_SIZE * scale
const offset = scale / 2

function mockCanvas(
  displaySize: number,
  cssSizePx = displaySize,
  bitmapSize = cssSizePx
): HTMLCanvasElement {
  return {
    width: bitmapSize,
    height: bitmapSize,
    clientWidth: cssSizePx,
    clientHeight: cssSizePx,
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
  it('maps mouse-like client coords to (0,0) via CSS pixels', () => {
    const canvas = mockCanvas(cssSize)
    const point = pointerEventToLogical(10 + offset, 20 + offset, canvas, scale)
    expect(point).toEqual({ row: 0, col: 0 })
  })

  it('maps center intersection (7,7)', () => {
    const canvas = mockCanvas(cssSize)
    const x = 10 + offset + 7 * scale
    const y = 20 + offset + 7 * scale
    expect(pointerEventToLogical(x, y, canvas, scale)).toEqual({ row: 7, col: 7 })
  })

  it('handles CSS-scaled canvas (display ≠ css layout size)', () => {
    const displaySize = cssSize / 2
    const canvas = mockCanvas(displaySize, cssSize)
    const displayX = (offset + 7 * scale) / 2
    const displayY = (offset + 7 * scale) / 2
    expect(pointerEventToLogical(10 + displayX, 20 + displayY, canvas, scale)).toEqual({
      row: 7,
      col: 7,
    })
  })

  it('handles high-DPR bitmap (width > clientWidth) without offset drift', () => {
    const dpr = 2
    const canvas = mockCanvas(cssSize, cssSize, cssSize * dpr)
    const x = 10 + offset + 7 * scale
    const y = 20 + offset + 7 * scale
    expect(pointerEventToLogical(x, y, canvas, scale)).toEqual({ row: 7, col: 7 })
  })

  it('returns null when pointer is outside canvas', () => {
    const canvas = mockCanvas(cssSize)
    expect(pointerEventToLogical(5, 20, canvas, scale)).toBeNull()
    expect(pointerEventToLogical(10, 5, canvas, scale)).toBeNull()
    expect(pointerEventToLogical(10 + cssSize + 1, 20 + offset, canvas, scale)).toBeNull()
  })

  it('returns null when scale is invalid', () => {
    const canvas = mockCanvas(cssSize)
    expect(pointerEventToLogical(10 + offset, 20 + offset, canvas, 0)).toBeNull()
    expect(pointerEventToLogical(10 + offset, 20 + offset, canvas, -1)).toBeNull()
  })
})
