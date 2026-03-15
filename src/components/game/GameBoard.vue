<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createBoardRenderer, createCoordMapper } from '../../renderer'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 测试用：最后一次有效点击的 (row, col) */
const lastClick = ref<{ row: number; col: number } | null>(null)
/** 本地棋盘状态，0 空 1 黑 2 白，用于手动测试棋子绘制（Issue 4 后将由 Pinia 替代） */
const board = ref<number[][]>(
  Array.from({ length: 15 }, () => Array(15).fill(0))
)
/** 当前落子方，1 黑 2 白 */
const currentPlayer = ref<1 | 2>(1)
let resizeObserver: ResizeObserver | null = null

const BOARD_SIZE = 15

function getScale(): number {
  const container = containerRef.value
  if (!container) return 0
  const w = container.clientWidth
  const h = container.clientHeight
  if (w <= 0 || h <= 0) return 0
  return Math.min(w, h) / BOARD_SIZE
}

function draw() {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas) return
  const w = container.clientWidth
  const h = container.clientHeight
  if (w <= 0 || h <= 0) return
  const renderer = createBoardRenderer(canvas, {
    containerWidth: w,
    containerHeight: h,
  })
  renderer.drawBoard()
  renderer.drawPieces(board.value)
}

function handlePointerDown(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas || e.target !== canvas) return
  const scale = getScale()
  if (scale <= 0) return
  const mapper = createCoordMapper(scale)
  const rect = canvas.getBoundingClientRect()
  const displayX = e.clientX - rect.left
  const displayY = e.clientY - rect.top
  const bitmapX = displayX * (canvas.width / rect.width)
  const bitmapY = displayY * (canvas.height / rect.height)
  const logical = mapper.pixelToLogical(bitmapX, bitmapY)
  if (!logical) return
  const { row, col } = logical
  lastClick.value = logical
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return
  const rowData = board.value[row]
  if (!rowData || rowData[col] !== 0) return
  rowData[col] = currentPlayer.value
  currentPlayer.value = currentPlayer.value === 1 ? 2 : 1
  draw()
  console.log('[piece]', logical, rowData[col] === 1 ? '黑' : '白')
}

onMounted(() => {
  draw()
  const container = containerRef.value
  if (!container) return
  resizeObserver = new ResizeObserver(() => draw())
  resizeObserver.observe(container)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="containerRef" class="game-board">
    <canvas
      ref="canvasRef"
      class="game-board__canvas"
      @pointerdown="handlePointerDown"
    />
    <div class="game-board__hint" aria-live="polite">
      <span>当前：{{ currentPlayer === 1 ? '黑' : '白' }}方</span>
      <span v-if="lastClick !== null"> · 上次 ({{ lastClick.row }}, {{ lastClick.col }})</span>
    </div>
  </div>
</template>

<style scoped>
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.game-board__canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  cursor: pointer;
}
.game-board__hint {
  position: absolute;
  bottom: 0.25rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: #666;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  pointer-events: none;
}
</style>
