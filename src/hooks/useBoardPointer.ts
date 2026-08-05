/**
 * 统一鼠标 / 触摸 / 触控笔落子：统一走 pointerdown → (row, col) → 回调
 * PC、Mobile H5、微信内置浏览器共用同一路径
 */

import type { Ref } from 'vue'
import { pointerEventToLogical } from '../renderer/pointerMapper'
import { unlockPlaceSound } from '../audio'

export interface UseBoardPointerOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  /** 当前棋盘 scale（与渲染层一致） */
  getScale: () => number
  /** 是否允许落子（对局进行中） */
  canPlace: () => boolean
  /** 映射到有效格点后调用 */
  onPlace: (row: number, col: number) => void
}

/**
 * 返回 pointerdown 处理器：仅主指针、仅鼠标左键；触摸时 preventDefault 避免滚动抢事件
 */
export function useBoardPointer(options: UseBoardPointerOptions) {
  function handlePointerDown(e: PointerEvent): void {
    // 忽略多指副指针、鼠标非主键（右键/中键）
    if (!e.isPrimary) return
    if (e.pointerType === 'mouse' && e.button !== 0) return

    // 用户手势中解锁音效，保证随后 AI 落子也能出声
    unlockPlaceSound()

    if (!options.canPlace()) return

    const canvas = options.canvasRef.value
    if (!canvas || e.target !== canvas) return

    // 触摸/触控笔：阻止页面滚动与后续合成 click，保证落子坐标稳定
    e.preventDefault()

    const scale = options.getScale()
    const logical = pointerEventToLogical(e.clientX, e.clientY, canvas, scale)
    if (!logical) return

    options.onPlace(logical.row, logical.col)
  }

  return { handlePointerDown }
}
