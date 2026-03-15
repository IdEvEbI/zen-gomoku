/**
 * 棋盘渲染器：15×15 格线绘制，响应式尺寸
 * scale = min(containerWidth, containerHeight) / 15
 * 暴露 drawBoard()、clear()
 */

const BOARD_SIZE = 15
const GRID_COLOR = '#333'
const LINE_WIDTH = 1

export interface BoardRendererOptions {
  /** 容器宽度（像素） */
  containerWidth: number
  /** 容器高度（像素） */
  containerHeight: number
}

/**
 * 创建并返回棋盘渲染器方法，绑定当前 canvas 与尺寸
 */
export function createBoardRenderer(
  canvas: HTMLCanvasElement,
  options: BoardRendererOptions
) {
  const { containerWidth, containerHeight } = options
  const scale =
    Math.min(containerWidth, containerHeight) / BOARD_SIZE
  const size = BOARD_SIZE * scale
  /** 半格偏移，使棋盘居中、四周留白不贴边 */
  const offset = scale / 2
  /** 格线仅在此矩形内绘制，不贴画布边缘 */
  const gridMin = offset
  const gridMax = offset + (BOARD_SIZE - 1) * scale

  return {
    /** 绘制 15×15 格线（横竖各 15 根线，线仅在 offset 内收，不贴边） */
    drawBoard(): void {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = size
      canvas.height = size

      ctx.strokeStyle = GRID_COLOR
      ctx.lineWidth = LINE_WIDTH

      for (let i = 0; i < BOARD_SIZE; i++) {
        const p = offset + i * scale
        ctx.beginPath()
        ctx.moveTo(p, gridMin)
        ctx.lineTo(p, gridMax)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(gridMin, p)
        ctx.lineTo(gridMax, p)
        ctx.stroke()
      }
    },

    /** 清空画布 */
    clear(): void {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    },
  }
}
