/**
 * 键值存储适配层：Web 用 localStorage，测试可用内存实现
 */

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const DEFAULT_RECORD_STORAGE_KEY = 'zen-gomoku:last-record'

export function createMemoryStorage(initial?: Record<string, string>): KeyValueStorage {
  const map = new Map<string, string>(Object.entries(initial ?? {}))
  return {
    getItem(key) {
      return map.has(key) ? map.get(key)! : null
    },
    setItem(key, value) {
      map.set(key, value)
    },
    removeItem(key) {
      map.delete(key)
    },
  }
}

/** 浏览器 localStorage；不可用时返回 null */
export function createLocalStorageAdapter(): KeyValueStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const probe = '__zen_gomoku_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    return null
  }
}
