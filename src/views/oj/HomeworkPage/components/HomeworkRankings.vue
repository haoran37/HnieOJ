<template>
  <div class="homework-rankings">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error">{{ error }}</n-alert>
      <n-empty v-else-if="!rows.length" description="暂无作业提交" class="empty-state" />
      <n-data-table v-else :columns="columns" :data="rows" :pagination="{ pageSize: 20 }" />
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { useRoute } from 'vue-router';
import { useHomeworkRankings } from '@/composables/oj/useHomeworkRankings';
import type { HomeworkRankVo } from '@/utils/api';

const route = useRoute();
const { rows, loading, error, fetchRankings } = useHomeworkRankings();
const columns: DataTableColumns<HomeworkRankVo> = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '用户', key: 'username' },
  { title: '通过题数', key: 'solved', width: 100 },
  { title: '总分', key: 'totalScore', width: 100 },
];

onMounted(() => {
  void fetchRankings(route.params.homeworkId as string);
});
</script>

<style scoped lang="less">
.homework-rankings {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-state {
    padding: 60px 0;
  }
}
</style>
