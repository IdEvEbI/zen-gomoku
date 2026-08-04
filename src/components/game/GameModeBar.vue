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
  <!-- 三列网格：按钮居中，状态文案放右侧，不挤歪按钮 -->
  <div class="mode-bar">
    <div class="mode-bar__spacer" aria-hidden="true" />
    <div class="mode-bar__btns">
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
    </div>
    <span
      class="mode-bar__status"
      :class="{ 'mode-bar__status--idle': !(vsAi && aiThinking) }"
    >
      AI 思考中…
    </span>
  </div>
</template>

<style scoped>
.mode-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  column-gap: 0.4rem;
  width: min(100%, 560px);
}
.mode-bar__spacer {
  min-width: 0;
}
.mode-bar__btns {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
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
  justify-self: start;
  font-size: 0.75rem;
  color: #666;
  white-space: nowrap;
}
.mode-bar__status--idle {
  visibility: hidden;
}
</style>
