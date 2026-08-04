<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  useGameStore,
  AI_DIFFICULTY_OPTIONS,
  type AiDifficulty,
} from '../../stores'

const gameStore = useGameStore()
const { vsAi, aiThinking, aiDifficulty } = storeToRefs(gameStore)

function toggleVsAi() {
  gameStore.setVsAi(!vsAi.value)
}

function onDifficultyChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as AiDifficulty
  gameStore.setAiDifficulty(value)
}
</script>

<template>
  <div class="mode-bar">
    <div class="mode-bar__row">
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

    <div v-if="vsAi" class="mode-bar__difficulty">
      <label class="mode-bar__diff-label" for="ai-difficulty">对手</label>
      <select
        id="ai-difficulty"
        class="mode-bar__select"
        :value="aiDifficulty"
        @change="onDifficultyChange"
      >
        <option
          v-for="opt in AI_DIFFICULTY_OPTIONS"
          :key="opt.id"
          :value="opt.id"
        >
          {{ opt.name }}
        </option>
      </select>
    </div>
    <!-- 人人模式占位，避免显隐跳动 -->
    <div v-else class="mode-bar__difficulty mode-bar__difficulty--idle" aria-hidden="true">
      <span class="mode-bar__diff-label">对手</span>
      <span class="mode-bar__select-ph">猪八戒</span>
    </div>
  </div>
</template>

<style scoped>
.mode-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: min(100%, 560px);
}
.mode-bar__row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  column-gap: 0.4rem;
  width: 100%;
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
.mode-bar__difficulty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 1.75rem;
}
.mode-bar__difficulty--idle {
  visibility: hidden;
}
.mode-bar__diff-label {
  font-size: 0.75rem;
  color: #666;
}
.mode-bar__select {
  padding: 0.25rem 0.45rem;
  font-size: 0.8rem;
  color: #333;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}
.mode-bar__select-ph {
  display: inline-block;
  min-width: 5rem;
  padding: 0.25rem 0.45rem;
  font-size: 0.8rem;
}
</style>
