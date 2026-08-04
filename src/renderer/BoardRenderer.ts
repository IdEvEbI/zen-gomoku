/**
 * 棋盘渲染器：15×15 格线绘制，棋子绘制，响应式尺寸
 * scale = min(containerWidth, containerHeight) / 15
 * 支持 devicePixelRatio，保证高分屏清晰
 * 暴露 drawBoard()、drawPiece()、drawPieces()、drawLastMoveMark()、clear()
 */

const BOARD_SIZE = 15
const GRID_COLOR = '#333'
const LINE_WIDTH = 1
/** 15×15 连珠盘五星（0-based）：天元 + 四角 */
export const STAR_POINTS: ReadonlyArray<readonly [number, number]> = [
  [3, 3],
  [3, 11],
  [7, 7],
  [11, 3],
  [11, 11],
]
const STAR_COLOR = '#3d2914'
const STAR_RADIUS_RATIO = 0.09
/** 棋子颜色：1 黑 2 白，与 store board 约定一致 */
export type PieceColor = 1 | 2
const PIECE_RADIUS_RATIO = 0.45
/** 白子描边：浅灰，在浅色棋盘上可见且不突兀 */
const WHITE_STROKE = '#999'
/**
 * 最近落子标记：常见五子棋做法为统一红色强调（空心小圆），
 * 黑白子上都醒目，避免「反色十字」在白子上发脏
 */
const LAST_MOVE_MARK = '#e53935'
const LAST_MOVE_RADIUS_RATIO = 0.15
const LAST_MOVE_LINE_RATIO = 0.055

export interface BoardRendererOptions {
  /** 容器宽度（CSS 像素） */
  containerWidth: number
  /** 容器高度（CSS 像素） */
  containerHeight: number
  /**
   * 设备像素比；默认取 window.devicePixelRatio（测试可传入 1）
   * 位图按 size * dpr 绘制，CSS 尺寸仍为 size，绘制坐标使用 CSS 像素
   */
  devicePixelRatio?: number
}

function resolveDpr(explicit?: number): number {
  if (typeof explicit === 'number' && explicit > 0) return explicit
  if (typeof window !== 'undefined' && window.devicePixelRatio > 0) {
    return window.devicePixelRatio
  }
  return 1
}

/**
 * 创建并返回棋盘渲染器方法，绑定当前 canvas 与尺寸
 */
export function createBoardRenderer(
  canvas: HTMLCanvasElement,
  options: BoardRendererOptions
) {
  const { containerWidth, containerHeight } = options
  const dpr = resolveDpr(options.devicePixelRatio)
  const scale =
    Math.min(containerWidth, containerHeight) / BOARD_SIZE
  const size = BOARD_SIZE * scale
  /** 半格偏移，使棋盘居中、四周留白不贴边 */
  const offset = scale / 2
  /** 格线仅在此矩形内绘制，不贴画布边缘 */
  const gridMin = offset
  const gridMax = offset + (BOARD_SIZE - 1) * scale

  return {
    /** 当前格宽（CSS 像素），与坐标映射一致 */
    getScale(): number {
      return scale
    },

    /** 棋盘边长（CSS 像素） */
    getSize(): number {
      return size
    },

    /** 绘制 15×15 格线（横竖各 15 根线，线仅在 offset 内收，不贴边） */
    drawBoard(): void {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = Math.max(1, Math.round(size * dpr))
      canvas.height = Math.max(1, Math.round(size * dpr))
      // 由外层正方形容器用 100% 铺满，避免 inline px + max-width 只压单边造成拉伸
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

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

      // 星位：格线之上、棋子之下
      const starR = Math.max(2, scale * STAR_RADIUS_RATIO)
      ctx.fillStyle = STAR_COLOR
      for (const [row, col] of STAR_POINTS) {
        const x = offset + col * scale
        const y = offset + row * scale
        ctx.beginPath()
        ctx.arc(x, y, starR, 0, Math.PI * 2)
        ctx.fill()
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

    /**
     * 在最近落子交点绘制红色空心小圆（黑白子通用，行业常见做法）
     */
    drawLastMoveMark(row: number, col: number): void {
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const centerX = offset + col * scale
      const centerY = offset + row * scale
      const radius = scale * LAST_MOVE_RADIUS_RATIO
      ctx.strokeStyle = LAST_MOVE_MARK
      ctx.lineWidth = Math.max(1.5, scale * LAST_MOVE_LINE_RATIO)
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.stroke()
    },

    /** 清空画布 */
    clear(): void {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
    },
  }
}
