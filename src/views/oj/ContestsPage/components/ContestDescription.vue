<template>
  <div class="contest-description">
    <n-card :bordered="false" class="desc-card">
      <v-md-preview :text="detail.description || '> 暂无比赛说明'"></v-md-preview>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import type { ContestDetail } from '@/composables/useContestDetail';

defineProps<{
  detail: ContestDetail
}>();
</script>

<style scoped lang="less">
.desc-card {
  min-height: 400px;
  
  :deep(.github-markdown-body) {
    padding: 0 !important; 
    font-size: 16px;
  }
}
</style>