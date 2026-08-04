/**
 * 指针事件坐标 → 棋盘 (row, col)
 * Mouse / Touch / Pen 共用同一套 clientX/clientY → 位图 → 逻辑格点 路径
 */

import { createCoordMapper, type LogicalPoint } from './coordMapper.ts'

/**
 * 将指针的 client 坐标映射到棋盘交点。
 * 仅当落点在 canvas 显示区域内且能落到有效交点时返回 (row, col)，否则 null。
 */
export function pointerEventToLogical(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  scale: number
): LogicalPoint | null {
  if (scale <= 0) return null
  if (canvas.width <= 0 || canvas.height <= 0) return null

  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const displayX = clientX - rect.left
  const displayY = clientY - rect.top
  if (
    displayX < 0 ||
    displayY < 0 ||
    displayX > rect.width ||
    displayY > rect.height
  ) {
    return null
  }

  const bitmapX = displayX * (canvas.width / rect.width)
  const bitmapY = displayY * (canvas.height / rect.height)
  return createCoordMapper(scale).pixelToLogical(bitmapX, bitmapY)
}
