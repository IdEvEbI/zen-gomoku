<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameStore } from '../../stores'

const gameStore = useGameStore()
const { vsAi, aiThinking } = storeToRefs(gameStore)

function toggleVsAi() {
  gameStore.setVsAi(!vsAi.value)
}
</script>

<template>
  <div class="mode-bar">
    <button
      type="button"
      class="mode-bar__btn"
      :class="{ 'mode-bar__btn--active': !vsAi }"
      @click="gameStore.setVsAi(false)"
    >
      人人
    </button>
    <button
      type="button"
      class="mode-bar__btn"
      :class="{ 'mode-bar__btn--active': vsAi }"
      @click="toggleVsAi"
    >
      人机（你执黑）
    </button>
    <span v-if="vsAi && aiThinking" class="mode-bar__status">AI 思考中…</span>
  </div>
</template>

<style scoped>
.mode-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: min(100%, 560px);
}
.mode-bar__btn {
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
  color: #333;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}
.mode-bar__btn:hover {
  background: #f3f3f3;
}
.mode-bar__btn--active {
  color: #fff;
  background: #555;
  border-color: #555;
}
.mode-bar__status {
  font-size: 0.75rem;
  color: #666;
}
</style>
