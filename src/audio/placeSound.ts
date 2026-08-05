/**
 * 落子音效
 * 素材：`place-stone-original.ogg` — CC0（freesound j1987/put_item，经 appgurueu/go）
 * 播放略加速，缩短拖尾、减轻沉闷感
 *
 * 可靠性：
 * - 每次播放 clone 节点，避免单例 Audio 连点 / 人机连下时 play() 被打断而静默失败
 * - 在用户手势中 unlock，避免 AI 先手时被浏览器自动播放策略拦截
 */

import placeStoneUrl from '../assets/audio/place-stone-original.ogg'

const STORAGE_KEY = 'zen-gomoku:place-sound-enabled'
const PLAYBACK_RATE = 1.75

let template: HTMLAudioElement | null = null
let unlocked = false

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

function ensureTemplate(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  if (!template) {
    template = new Audio(placeStoneUrl)
    template.preload = 'auto'
  }
  return template
}

/** 预加载（可在应用挂载时调用，失败静默） */
export function preloadPlaceSound(): void {
  try {
    ensureTemplate()?.load()
  } catch {
    /* ignore */
  }
}

/**
 * 在用户手势回调中调用一次，解锁后续 AI 落子的自动播放。
 * 静音播放并立即 pause，用户无感。
 */
export function unlockPlaceSound(): void {
  if (unlocked) return
  const base = ensureTemplate()
  if (!base) return
  try {
    const prevVol = base.volume
    base.volume = 0
    base.playbackRate = 1
    void base
      .play()
      .then(() => {
        base.pause()
        base.currentTime = 0
        base.volume = prevVol
        unlocked = true
      })
      .catch(() => {
        base.volume = prevVol
      })
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
 */
export function playPlaceSound(): void {
  if (!enabled) return
  const base = ensureTemplate()
  if (!base) return
  try {
    const el = base.cloneNode(true) as HTMLAudioElement
    el.playbackRate = PLAYBACK_RATE
    el.volume = 1
    void el.play().catch(() => {
      /* 未解锁或环境限制时忽略；下次用户手势 unlock 后再可播 */
    })
  } catch {
    /* ignore */
  }
}
