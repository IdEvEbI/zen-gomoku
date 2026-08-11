import { describe, it, expect } from 'vitest'
import { createBoardRenderer } from './BoardRenderer.ts'

const hasCanvas =
  typeof globalThis.document !== 'undefined' &&
  typeof globalThis.document.createElement === 'function'

describe('createBoardRenderer', () => {
  it.skipIf(!hasCanvas)('drawBoard draws without throw (includes star points)', () => {
    const canvas = document.createElement('canvas')
    const renderer = createBoardRenderer(canvas, {
      containerWidth: 300,
      containerHeight: 300,
    })
    expect(() => renderer.drawBoard()).not.toThrow()
  })

  it.skipIf(!hasCanvas)(
    'returns drawBoard, drawPiece, drawPieces, drawLastMoveMark, drawForbiddenMarks, clear',
    () => {
      const canvas = document.createElement('canvas')
      const renderer = createBoardRenderer(canvas, {
        containerWidth: 300,
        containerHeight: 300,
      })
      expect(typeof renderer.drawBoard).toBe('function')
      expect(typeof renderer.drawPiece).toBe('function')
      expect(typeof renderer.drawPieces).toBe('function')
      expect(typeof renderer.drawLastMoveMark).toBe('function')
      expect(typeof renderer.drawForbiddenMarks).toBe('function')
      expect(typeof renderer.clear).toBe('function')
    }
  )

  it.skipIf(!hasCanvas)('drawBoard then drawPiece does not throw', () => {
    const canvas = document.createElement('canvas')
    const renderer = createBoardRenderer(canvas, {
      containerWidth: 300,
      containerHeight: 300,
    })
    renderer.drawBoard()
    expect(() => renderer.drawPiece(0, 0, 1)).not.toThrow()
    expect(() => renderer.drawPiece(7, 7, 2)).not.toThrow()
  })

  it.skipIf(!hasCanvas)('drawPieces with board array does not throw', () => {
    const canvas = document.createElement('canvas')
    const renderer = createBoardRenderer(canvas, {
      containerWidth: 300,
      containerHeight: 300,
    })
    renderer.drawBoard()
    const board = Array.from({ length: 15 }, () => Array(15).fill(0)) as number[][]
    board[0]![0] = 1
    board[14]![14] = 2
    board[7]![7] = 1
    expect(() => renderer.drawPieces(board)).not.toThrow()
  })

  it.skipIf(!hasCanvas)('drawLastMoveMark does not throw', () => {
    const canvas = document.createElement('canvas')
    const renderer = createBoardRenderer(canvas, {
      containerWidth: 300,
      containerHeight: 300,
    })
    renderer.drawBoard()
    renderer.drawPiece(7, 7, 1)
    expect(() => renderer.drawLastMoveMark(7, 7)).not.toThrow()
    expect(() => renderer.drawLastMoveMark(-1, 0)).not.toThrow()
  })

  it.skipIf(!hasCanvas)('drawForbiddenMarks does not throw', () => {
    const canvas = document.createElement('canvas')
    const renderer = createBoardRenderer(canvas, {
      containerWidth: 300,
      containerHeight: 300,
    })
    renderer.drawBoard()
    expect(() =>
      renderer.drawForbiddenMarks([
        { row: 7, col: 7 },
        { row: 0, col: 0 },
      ])
    ).not.toThrow()
    expect(() => renderer.drawForbiddenMarks([])).not.toThrow()
  })

  it.skipIf(!hasCanvas)('clear does not throw', () => {
    const canvas = document.createElement('canvas')
    const renderer = createBoardRenderer(canvas, {
      containerWidth: 300,
      containerHeight: 300,
    })
    renderer.drawBoard()
    expect(() => renderer.clear()).not.toThrow()
  })

  it.skipIf(!hasCanvas)('applies devicePixelRatio to bitmap and fills container via CSS %', () => {
    const canvas = document.createElement('canvas')
    const renderer = createBoardRenderer(canvas, {
      containerWidth: 300,
      containerHeight: 300,
      devicePixelRatio: 2,
    })
    renderer.drawBoard()
    expect(renderer.getSize()).toBe(300)
    expect(canvas.width).toBe(600)
    expect(canvas.height).toBe(600)
    expect(canvas.style.width).toBe('100%')
    expect(canvas.style.height).toBe('100%')
  })
})
