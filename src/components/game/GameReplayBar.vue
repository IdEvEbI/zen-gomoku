<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore, REPLAY_INTERVAL_MS } from '../../stores'

const gameStore = useGameStore()
const { history, displayHistoryIndex, isReplayPlaying, canReplay, isAtLiveEdge } =
  storeToRefs(gameStore)

let timer: ReturnType<typeof setInterval> | null = null

function clearTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

watch(isReplayPlaying, (playing) => {
  clearTimer()
  if (!playing) return
  timer = setInterval(() => {
    gameStore.tickReplay()
  }, REPLAY_INTERVAL_MS)
})

onUnmounted(() => {
  clearTimer()
  gameStore.pauseReplay()
})
</script>

<template>
  <!-- 始终占位，无棋谱时隐藏可见性，避免复盘条弹出导致棋盘跳动 -->
  <div
    class="replay-bar"
    :class="{ 'replay-bar--idle': !canReplay }"
    aria-label="复盘控制"
    :aria-hidden="!canReplay"
  >
    <div class="replay-bar__actions">
      <button
        type="button"
        class="replay-bar__btn"
        title="开头"
        :disabled="!canReplay || displayHistoryIndex <= 0"
        @click="gameStore.goToStart()"
      >
        |◀
      </button>
      <button
        type="button"
        class="replay-bar__btn"
        title="后退一手"
        :disabled="!canReplay || displayHistoryIndex <= 0"
        @click="gameStore.stepBack()"
      >
        ◀
      </button>
      <button
        type="button"
        class="replay-bar__btn replay-bar__btn--primary"
        :title="isReplayPlaying ? '暂停' : '播放'"
        :disabled="!canReplay"
        @click="gameStore.toggleReplay()"
      >
        {{ isReplayPlaying ? '暂停' : '播放' }}
      </button>
      <button
        type="button"
        class="replay-bar__btn"
        title="前进一手"
        :disabled="!canReplay || isAtLiveEdge"
        @click="gameStore.stepForward()"
      >
        ▶
      </button>
      <button
        type="button"
        class="replay-bar__btn"
        title="最新"
        :disabled="!canReplay || isAtLiveEdge"
        @click="gameStore.goToEnd()"
      >
        ▶|
      </button>
    </div>
    <p class="replay-bar__meta">
      复盘 {{ displayHistoryIndex }} / {{ history.length }}
      <span v-if="!isAtLiveEdge" class="replay-bar__hint">（浏览中，不可落子）</span>
    </p>
  </div>
</template>

<style scoped>
.replay-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: min(100%, 560px);
  min-height: 3.4rem;
}
.replay-bar--idle {
  visibility: hidden;
  pointer-events: none;
}
.replay-bar__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
}
.replay-bar__btn {
  min-width: 2.4rem;
  padding: 0.3rem 0.55rem;
  font-size: 0.8rem;
  color: #333;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}
.replay-bar__btn:hover:not(:disabled) {
  background: #f3f3f3;
}
.replay-bar__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.replay-bar__btn--primary {
  min-width: 3.2rem;
  font-weight: 600;
}
.replay-bar__meta {
  margin: 0;
  font-size: 0.75rem;
  color: #555;
}
.replay-bar__hint {
  color: #888;
}
</style>
