<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../../stores'
import { createLocalStorageAdapter, downloadTextFile, readTextFile } from '../../storage'

const gameStore = useGameStore()
const { status } = storeToRefs(gameStore)
const fileInputRef = ref<HTMLInputElement | null>(null)
const message = ref<string | null>(null)
const messageIsError = ref(false)

function flash(text: string, isError = false) {
  message.value = text
  messageIsError.value = isError
}

function saveLocal(successText: string) {
  const storage = createLocalStorageAdapter()
  if (!storage) {
    flash('当前环境不支持本地存储', true)
    return false
  }
  const result = gameStore.saveToStorage(storage)
  flash(result.success ? successText : result.message, !result.success)
  return result.success
}

function handleSaveLocal() {
  saveLocal('已保存到本地')
}

function handleLoadLocal() {
  const storage = createLocalStorageAdapter()
  if (!storage) {
    flash('当前环境不支持本地存储', true)
    return
  }
  const result = gameStore.loadFromStorage(storage)
  flash(result.success ? '已从本地加载' : result.message, !result.success)
}

function handleExportFile() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadTextFile(`zen-gomoku-${stamp}.json`, gameStore.exportRecordJson())
  flash('已导出棋谱文件')
}

function handleImportClick() {
  fileInputRef.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const text = await readTextFile(file)
    const result = gameStore.loadRecord(text)
    flash(result.success ? '已导入棋谱' : result.message, !result.success)
  } catch {
    flash('读取文件失败', true)
  }
}

/** 终局（胜/和）时自动写入 localStorage */
watch(status, (next, prev) => {
  if (next === 'playing' || next === prev) return
  saveLocal('对局结束，已自动保存棋谱')
})
</script>

<template>
  <div class="record-bar">
    <div class="record-bar__actions">
      <button type="button" class="record-bar__btn" @click="handleSaveLocal">保存</button>
      <button type="button" class="record-bar__btn" @click="handleLoadLocal">加载</button>
      <button type="button" class="record-bar__btn" @click="handleExportFile">导出</button>
      <button type="button" class="record-bar__btn" @click="handleImportClick">导入</button>
      <input
        ref="fileInputRef"
        class="record-bar__file"
        type="file"
        accept="application/json,.json"
        @change="handleFileChange"
      />
    </div>
    <!-- 固定占位，避免提示显隐导致棋盘上下跳动 -->
    <p
      class="record-bar__msg"
      :class="{
        'record-bar__msg--error': messageIsError,
        'record-bar__msg--empty': !message,
      }"
      aria-live="polite"
    >
      {{ message || '\u00a0' }}
    </p>
  </div>
</template>

<style scoped>
.record-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: min(100%, 560px);
}
.record-bar__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
}
.record-bar__btn {
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
  color: #333;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}
.record-bar__btn:hover {
  background: #f3f3f3;
}
.record-bar__file {
  display: none;
}
.record-bar__msg {
  margin: 0;
  min-height: 1.15em;
  font-size: 0.75rem;
  line-height: 1.15;
  color: #555;
  text-align: center;
}
.record-bar__msg--empty {
  visibility: hidden;
}
.record-bar__msg--error {
  color: #c00;
}
</style>
