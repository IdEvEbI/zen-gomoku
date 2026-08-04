/**
 * 指针事件坐标 → 棋盘 (row, col)
 * Mouse / Touch / Pen 共用同一套 clientX/clientY → CSS 像素 → 逻辑格点 路径
 * （与 BoardRenderer 的 CSS 像素绘制坐标系一致，兼容 devicePixelRatio）
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

  // 使用 CSS 像素坐标系（clientWidth），避免位图尺寸含 DPR 时映射偏移
  const cssWidth = canvas.clientWidth || rect.width
  const cssHeight = canvas.clientHeight || rect.height
  if (cssWidth <= 0 || cssHeight <= 0) return null

  const cssX = displayX * (cssWidth / rect.width)
  const cssY = displayY * (cssHeight / rect.height)
  return createCoordMapper(scale).pixelToLogical(cssX, cssY)
}
