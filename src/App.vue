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
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.app__board-wrap {
  width: min(90vmin, 420px);
  height: min(90vmin, 420px);
  background: #dcb35c;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
