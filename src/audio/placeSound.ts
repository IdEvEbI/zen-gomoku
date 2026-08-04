/**
 * 落子音效
 * 素材：`place-stone-original.ogg` — CC0（freesound j1987/put_item，经 appgurueu/go）
 * 播放略加速，缩短拖尾、减轻沉闷感
 */

import placeStoneUrl from '../assets/audio/place-stone-original.ogg'

const STORAGE_KEY = 'zen-gomoku:place-sound-enabled'

let audio: HTMLAudioElement | null = null
let loadStarted = false

function readEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true
    return raw !== '0' && raw !== 'false'
  } catch {
    return true
  }
}

let enabled = typeof localStorage !== 'undefined' ? readEnabled() : true

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
  }
  if (!loadStarted) {
    loadStarted = true
    audio.src = placeStoneUrl
  }
  return audio
}

/** 预加载（可在应用挂载时调用，失败静默） */
export function preloadPlaceSound(): void {
  try {
    ensureAudio()?.load()
  } catch {
    /* ignore */
  }
}

export function isPlaceSoundEnabled(): boolean {
  return enabled
}

export function setPlaceSoundEnabled(next: boolean): void {
  enabled = next
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function togglePlaceSoundEnabled(): boolean {
  setPlaceSoundEnabled(!enabled)
  return enabled
}

/**
 * 播放落子声（人机/人人/AI 共用）。
 * 需在用户手势后浏览器才允许自动播放；首次落子即可解锁。
 */
export function playPlaceSound(): void {
  if (!enabled) return
  const el = ensureAudio()
  if (!el) return
  try {
    el.currentTime = 0
    el.playbackRate = 1.75
    void el.play().catch(() => {
      /* 自动播放受限时忽略 */
    })
  } catch {
    /* ignore */
  }
}
