<script setup lang="ts">
import GameBoard from './components/game/GameBoard.vue'
import GameRecordBar from './components/game/GameRecordBar.vue'
import GameReplayBar from './components/game/GameReplayBar.vue'
import GameModeBar from './components/game/GameModeBar.vue'
</script>

<template>
  <div class="app">
    <GameModeBar />
    <GameRecordBar />
    <div class="app__board-wrap">
      <GameBoard />
    </div>
    <GameReplayBar />
  </div>
</template>

<style scoped>
.app {
  box-sizing: border-box;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #f5f5f5;
  padding: max(0.75rem, env(safe-area-inset-top, 0px)) max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px)) max(0.75rem, env(safe-area-inset-left, 0px));
}

.app__board-wrap {
  /* 预留模式栏(含先后/对手) + 记录栏 + 复盘栏 */
  --toolbar-reserve: 11.5rem;
  --board-size: min(
    560px,
    calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - 1.5rem),
    calc(
      100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem -
        var(--toolbar-reserve)
    )
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
      calc(
        100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem -
          var(--toolbar-reserve)
      )
    );
  }
}
</style>
