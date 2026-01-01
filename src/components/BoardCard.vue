<template>
  <div class="board-card">
    <div class="card-header">
      <div class="title-wrapper">
        <slot name="icon"></slot>
        <span class="title-text">{{ title }}</span>
      </div>
      <div class="extra-wrapper">
        <slot name="extra"></slot>
      </div>
    </div>
    
    <div class="card-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    title: string;
  }>();
</script>

<style scoped lang="less">
.board-card {
  background: #FFFFFF;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 20px;
  width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .card-header {
    background-color: #f5f5f5; // 标题栏灰色背景
    padding: 8px 12px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      color: #333;
      font-size: 18px;
      letter-spacing: 0.5px;
    }
  }

  .card-content {
    padding: 16px;
    word-wrap: break-word;
    word-break: break-all;
  }
}
</style>