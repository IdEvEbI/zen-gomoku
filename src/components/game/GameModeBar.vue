<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  useGameStore,
  AI_DIFFICULTY_OPTIONS,
  RULE_SET_OPTIONS,
  type AiDifficulty,
  type RuleSetId,
} from '../../stores'
import {
  isPlaceSoundEnabled,
  togglePlaceSoundEnabled,
  unlockPlaceSound,
} from '../../audio'

const gameStore = useGameStore()
const { vsAi, aiThinking, aiDifficulty, humanFirst, rules } =
  storeToRefs(gameStore)
const soundOn = ref(isPlaceSoundEnabled())

function toggleVsAi() {
  unlockPlaceSound()
  gameStore.setVsAi(!vsAi.value)
}

function onDifficultyChange(event: Event) {
  unlockPlaceSound()
  const value = (event.target as HTMLSelectElement).value as AiDifficulty
  gameStore.setAiDifficulty(value)
}

function onFirstChange(event: Event) {
  unlockPlaceSound()
  const value = (event.target as HTMLSelectElement).value
  gameStore.setHumanFirst(value === 'human')
}

function onRulesChange(event: Event) {
  unlockPlaceSound()
  const value = (event.target as HTMLSelectElement).value as RuleSetId
  gameStore.setRules(value)
}

function onToggleSound() {
  unlockPlaceSound()
  soundOn.value = togglePlaceSoundEnabled()
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
          人机
        </button>
        <button
          type="button"
          class="mode-bar__btn"
          :class="{ 'mode-bar__btn--active': soundOn }"
          :title="soundOn ? '关闭落子音效' : '开启落子音效'"
          @click="onToggleSound"
        >
          {{ soundOn ? '音效开' : '音效关' }}
        </button>
      </div>
      <span
        class="mode-bar__status"
        :class="{ 'mode-bar__status--idle': !(vsAi && aiThinking) }"
      >
        AI 思考中…
      </span>
    </div>

    <div class="mode-bar__options mode-bar__options--rules">
      <label class="mode-bar__diff-label" for="game-rules">规则</label>
      <select
        id="game-rules"
        class="mode-bar__select"
        :value="rules"
        @change="onRulesChange"
      >
        <option v-for="opt in RULE_SET_OPTIONS" :key="opt.id" :value="opt.id">
          {{ opt.name }}
        </option>
      </select>
    </div>

    <div
      class="mode-bar__options"
      :class="{ 'mode-bar__options--idle': !vsAi }"
      :aria-hidden="!vsAi"
    >
      <label class="mode-bar__diff-label" for="ai-first">先后</label>
      <select
        id="ai-first"
        class="mode-bar__select"
        :value="humanFirst ? 'human' : 'ai'"
        :disabled="!vsAi"
        @change="onFirstChange"
      >
        <option value="human">你先（执黑）</option>
        <option value="ai">AI 先（执黑）</option>
      </select>
      <label class="mode-bar__diff-label" for="ai-difficulty">对手</label>
      <select
        id="ai-difficulty"
        class="mode-bar__select"
        :value="aiDifficulty"
        :disabled="!vsAi"
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
.mode-bar__options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 1.75rem;
}
.mode-bar__options--rules {
  min-height: auto;
}
.mode-bar__options--idle {
  visibility: hidden;
  pointer-events: none;
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
.mode-bar__select:disabled {
  cursor: not-allowed;
}
</style>
