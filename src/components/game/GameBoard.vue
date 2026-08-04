<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { createBoardRenderer } from '../../renderer'
import { useGameStore } from '../../stores'
import { useBoardPointer } from '../../hooks'

const gameStore = useGameStore()
const {
  displayBoard,
  currentPlayer,
  status,
  history,
  displayHistoryIndex,
  isAtLiveEdge,
} = storeToRefs(gameStore)

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 最后一次有效点击的 (row, col)；非法落子时的提示信息 */
const lastClick = ref<{ row: number; col: number } | null>(null)
const lastMessage = ref<string | null>(null)
let resizeObserver: ResizeObserver | null = null
let rafId = 0

const BOARD_SIZE = gameStore.boardSize

function getBoardSide(): number {
  const container = containerRef.value
  if (!container) return 0
  const w = container.clientWidth
  const h = container.clientHeight
  if (w <= 0 || h <= 0) return 0
  return Math.min(w, h)
}

function getScale(): number {
  const side = getBoardSide()
  return side > 0 ? side / BOARD_SIZE : 0
}

function draw() {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas) return
  const side = getBoardSide()
  if (side <= 0) return
  const renderer = createBoardRenderer(canvas, {
    containerWidth: side,
    containerHeight: side,
  })
  renderer.drawBoard()
  renderer.drawPieces(displayBoard.value)
}

function scheduleDraw() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    rafId = 0
    draw()
  })
}

function placeAt(row: number, col: number) {
  lastMessage.value = null
  const result = gameStore.placeStone(row, col)
  if (result.success) {
    lastClick.value = { row, col }
    draw()
  } else {
    lastMessage.value = result.message
  }
}

const { handlePointerDown } = useBoardPointer({
  canvasRef,
  getScale,
  canPlace: () => gameStore.canPlay,
  onPlace: placeAt,
})

function handleRestart() {
  gameStore.resetGame()
  lastClick.value = null
  lastMessage.value = null
  draw()
}

function handleStartReplay() {
  gameStore.goToStart()
  lastMessage.value = null
}

/** 棋谱 / 复盘索引变化时重绘 */
watch(
  [displayBoard, history, status, displayHistoryIndex],
  () => {
    scheduleDraw()
  },
  { deep: true }
)

onMounted(() => {
  draw()
  const container = containerRef.value
  if (container) {
    resizeObserver = new ResizeObserver(() => scheduleDraw())
    resizeObserver.observe(container)
  }
  window.addEventListener('orientationchange', scheduleDraw)
  window.visualViewport?.addEventListener('resize', scheduleDraw)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('orientationchange', scheduleDraw)
  window.visualViewport?.removeEventListener('resize', scheduleDraw)
  if (rafId) cancelAnimationFrame(rafId)
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
      <template v-if="status === 'playing' && isAtLiveEdge">
        <span>当前：{{ currentPlayer === 1 ? '黑' : '白' }}方</span>
        <span v-if="lastClick !== null"> · 上次 ({{ lastClick.row }}, {{ lastClick.col }})</span>
      </template>
      <template v-else-if="!isAtLiveEdge">
        <span>复盘第 {{ displayHistoryIndex }} 手</span>
      </template>
      <span v-else-if="status === 'black_win'">黑方胜</span>
      <span v-else-if="status === 'white_win'">白方胜</span>
      <span v-if="lastMessage" class="game-board__hint--error">{{ lastMessage }}</span>
    </div>
    <!-- 终局遮罩：复盘浏览中隐藏，便于看棋 -->
    <div
      v-if="status !== 'playing' && isAtLiveEdge"
      class="game-board__overlay"
      role="dialog"
      aria-label="对局结束"
    >
      <p class="game-board__result">
        {{ status === 'black_win' ? '黑方胜' : status === 'white_win' ? '白方胜' : '和棋' }}
      </p>
      <div class="game-board__overlay-actions">
        <button type="button" class="game-board__restart" @click="handleStartReplay">复盘</button>
        <button type="button" class="game-board__restart" @click="handleRestart">重新开始</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: none;
  overflow: hidden;
}
.game-board__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.game-board__hint {
  position: absolute;
  bottom: max(0.25rem, env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 0.5rem);
  font-size: clamp(0.65rem, 2.4vmin, 0.8rem);
  color: #666;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  gap: clamp(0.5rem, 3vmin, 1rem);
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  padding: 0.75rem;
}
.game-board__overlay-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}
.game-board__result {
  margin: 0;
  font-size: clamp(1rem, 4.5vmin, 1.25rem);
  font-weight: 600;
  color: #fff;
}
.game-board__restart {
  padding: 0.5rem 1rem;
  font-size: clamp(0.8rem, 3.2vmin, 0.9rem);
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
