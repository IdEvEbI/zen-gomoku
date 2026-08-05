import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isPlaceSoundEnabled,
  setPlaceSoundEnabled,
  togglePlaceSoundEnabled,
  playPlaceSound,
  unlockPlaceSound,
} from './placeSound'

describe('placeSound', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
    setPlaceSoundEnabled(true)
  })

  it('defaults to enabled and can toggle', () => {
    expect(isPlaceSoundEnabled()).toBe(true)
    expect(togglePlaceSoundEnabled()).toBe(false)
    expect(isPlaceSoundEnabled()).toBe(false)
    expect(togglePlaceSoundEnabled()).toBe(true)
  })

  it('playPlaceSound does not throw when muted', () => {
    setPlaceSoundEnabled(false)
    expect(() => playPlaceSound()).not.toThrow()
  })

  it('unlockPlaceSound and playPlaceSound do not throw', () => {
    expect(() => unlockPlaceSound()).not.toThrow()
    expect(() => playPlaceSound()).not.toThrow()
  })
})
