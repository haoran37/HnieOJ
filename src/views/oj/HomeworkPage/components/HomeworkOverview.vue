<template>
  <div class="homework-overview">
    <div class="paper-sheet">
      <v-md-preview :text="detail.description || '> 暂无作业要求'"></v-md-preview>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HomeworkDetail } from '@/composables/oj/useHomeworkDetail';
defineProps<{ detail: HomeworkDetail }>();
</script>

<style scoped lang="less">
.paper-sheet {
  max-width: 100%;
  
  :deep(.github-markdown-body) {
    font-size: 16px;
    line-height: 1.8;
    color: #2c3e50;
    padding: 0 !important;
  }
}
</style>