<script setup lang="ts">
import GameBoard from './components/game/GameBoard.vue'
</script>

<template>
  <div class="app">
    <div class="app__board-wrap">
      <GameBoard />
    </div>
  </div>
</template>

<style scoped>
.app {
  box-sizing: border-box;
  width: 100%;
  /* 固定视口高度，避免 min-height 在横屏下撑出可滚动区域导致裁切错觉 */
  height: 100vh;
  height: 100dvh;
  display: grid;
  place-items: center;
  background: #f5f5f5;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
}

.app__board-wrap {
  /*
   * 宽高同一变量，强制正方形。
   * min(可用宽, 可用高, 上限)：横屏吃高度、竖屏吃宽度。
   * 只用 vw/vh，避免不支持 dvw 时整段 min() 失效。
   */
  --board-size: min(
    560px,
    calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - 1.5rem),
    calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem)
  );
  box-sizing: border-box;
  width: var(--board-size);
  height: var(--board-size);
  max-width: 100%;
  max-height: 100%;
  background: #dcb35c;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@supports (height: 100dvh) {
  .app {
    height: 100dvh;
  }

  .app__board-wrap {
    --board-size: min(
      560px,
      calc(100dvw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - 1.5rem),
      calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem)
    );
  }
}
</style>
