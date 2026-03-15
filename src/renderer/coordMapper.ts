/**
 * 坐标换算：像素 ↔ 棋盘 (row, col)
 * 点击/触摸坐标（canvas 位图坐标）→ 减偏移、除 scale → 四舍五入到交点 → (row, col)
 */

const BOARD_SIZE = 15

export interface LogicalPoint {
  row: number
  col: number
}

export interface PixelPoint {
  x: number
  y: number
}

/**
 * 创建坐标映射器，与 BoardRenderer 使用相同的 scale 与 offset 约定
 * offset = scale/2，棋盘在画布内居中、四周半格边距
 */
export function createCoordMapper(scale: number) {
  const size = BOARD_SIZE * scale
  const offset = scale / 2

  return {
    /**
     * 像素（canvas 位图坐标）→ 棋盘交点 (row, col)，0 ≤ row,col ≤ 14
     * 超出棋盘返回 null
     */
    pixelToLogical(bitmapX: number, bitmapY: number): LogicalPoint | null {
      const col = Math.round((bitmapX - offset) / scale)
      const row = Math.round((bitmapY - offset) / scale)
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return null
      }
      return { row, col }
    },

    /**
     * 棋盘交点 (row, col) → 该交点在 canvas 位图上的像素坐标（交点即格线交点）
     */
    logicalToPixel(row: number, col: number): PixelPoint {
      return {
        x: offset + col * scale,
        y: offset + row * scale,
      }
    },

    /** 当前 scale，供外部使用 */
    getScale(): number {
      return scale
    },

    /** 半格偏移（与 BoardRenderer 一致） */
    getOffset(): number {
      return offset
    },

    /** 棋盘边长（像素） */
    getSize(): number {
      return size
    },
  }
}

/** 导出常量供调用方与 BoardRenderer 一致 */
export { BOARD_SIZE }
