<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { createBoardRenderer, createCoordMapper } from '../../renderer'
import { useGameStore } from '../../stores'

const gameStore = useGameStore()
const { board, currentPlayer, status } = storeToRefs(gameStore)

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 最后一次有效点击的 (row, col)；非法落子时的提示信息 */
const lastClick = ref<{ row: number; col: number } | null>(null)
const lastMessage = ref<string | null>(null)
let resizeObserver: ResizeObserver | null = null

const BOARD_SIZE = gameStore.boardSize

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
  lastMessage.value = null
  const result = gameStore.placeStone(row, col)
  if (result.success) {
    lastClick.value = logical
    draw()
  } else {
    lastMessage.value = result.message
  }
}

function handleRestart() {
  gameStore.resetGame()
  lastClick.value = null
  lastMessage.value = null
  draw()
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
      <template v-if="status === 'playing'">
        <span>当前：{{ currentPlayer === 1 ? '黑' : '白' }}方</span>
        <span v-if="lastClick !== null"> · 上次 ({{ lastClick.row }}, {{ lastClick.col }})</span>
      </template>
      <span v-else-if="status === 'black_win'">黑方胜</span>
      <span v-else-if="status === 'white_win'">白方胜</span>
      <span v-if="lastMessage" class="game-board__hint--error">{{ lastMessage }}</span>
    </div>
    <div v-if="status !== 'playing'" class="game-board__overlay" role="dialog" aria-label="对局结束">
      <p class="game-board__result">
        {{ status === 'black_win' ? '黑方胜' : status === 'white_win' ? '白方胜' : '和棋' }}
      </p>
      <button type="button" class="game-board__restart" @click="handleRestart">重新开始</button>
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
.game-board__hint--error {
  color: #c00;
  margin-left: 0.25rem;
}
.game-board__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
}
.game-board__result {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
}
.game-board__restart {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  color: #333;
  background: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.game-board__restart:hover {
  background: #f0f0f0;
}
</style>
