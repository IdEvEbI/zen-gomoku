<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createBoardRenderer } from '../../renderer'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | null = null

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
    <canvas ref="canvasRef" class="game-board__canvas" />
  </div>
</template>

<style scoped>
.game-board {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.game-board__canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
}
</style>
