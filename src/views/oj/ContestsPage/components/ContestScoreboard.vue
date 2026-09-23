<template>
  <div class="contest-scoreboard">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error">{{ error }}</n-alert>
      <n-empty v-else-if="!rows.length" description="暂无参赛提交" class="empty-state" />
      <n-data-table v-else :columns="columns" :data="rows" :pagination="{ pageSize: 20 }" />
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { useRoute } from 'vue-router';
import { useContestScoreboard } from '@/composables/oj/useContestScoreboard';
import type { ContestRankVo } from '@/utils/api';

const route = useRoute();
const { rows, loading, error, fetchScoreboard } = useContestScoreboard();
const columns: DataTableColumns<ContestRankVo> = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '用户', key: 'username' },
  { title: '通过题数', key: 'solved', width: 100 },
  { title: '总分', key: 'totalScore', width: 90 },
  { title: '罚时（分钟）', key: 'penaltyMinutes', width: 130 },
];

watch(() => route.params.contestId, id => {
  if (typeof id === 'string') void fetchScoreboard(id);
}, { immediate: true });
</script>

<style scoped lang="less">
.contest-scoreboard {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-state {
    padding: 60px 0;
  }
}
</style>
