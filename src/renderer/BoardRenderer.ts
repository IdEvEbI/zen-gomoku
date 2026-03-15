/**
 * 棋盘渲染器：15×15 格线绘制，棋子绘制，响应式尺寸
 * scale = min(containerWidth, containerHeight) / 15
 * 暴露 drawBoard()、drawPiece()、drawPieces()、clear()
 */

const BOARD_SIZE = 15
const GRID_COLOR = '#333'
const LINE_WIDTH = 1
/** 棋子颜色：1 黑 2 白，与 store board 约定一致 */
export type PieceColor = 1 | 2
const PIECE_RADIUS_RATIO = 0.45
/** 白子描边：浅灰，在浅色棋盘上可见且不突兀 */
const WHITE_STROKE = '#999'

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

    /**
     * 在交点 (row, col) 绘制一枚棋子，color 1 黑 2 白
     * 渲染层不持有状态，由调用方传入
     */
    drawPiece(row: number, col: number, color: PieceColor): void {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const centerX = offset + col * scale
      const centerY = offset + row * scale
      const radius = scale * PIECE_RADIUS_RATIO
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      if (color === 1) {
        ctx.fillStyle = '#000'
        ctx.fill()
      } else {
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = WHITE_STROKE
        ctx.lineWidth = LINE_WIDTH
        ctx.stroke()
      }
    },

    /**
     * 根据 board 二维数组重绘所有棋子，0 空 1 黑 2 白
     * 不持有状态，仅根据传入的 board 绘制
     */
    drawPieces(board: number[][]): void {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const v = board[row]?.[col]
          if (v === 1 || v === 2) {
            this.drawPiece(row, col, v as PieceColor)
          }
        }
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
