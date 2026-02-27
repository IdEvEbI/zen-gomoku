<script setup lang="ts">
// 棋子组件：单颗棋子展示（若用 DOM 渲染）；Canvas 方案可在 GameBoard 内统一绘制
defineProps<{
  color?: 'black' | 'white'
}>()
</script>

<template>
  <div class="game-piece" :data-color="color">
    <!-- 棋子占位 -->
  </div>
</template>

<style scoped>
.game-piece {
  /* 棋子样式 */
}
</style>
