<template>
  <div class="contest-problems-container">
    <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
      {{ error }}
    </n-alert>
    <div class="table-card">
      <n-data-table
        :columns="columns"
        :data="problems"
        :loading="loading"
        :row-key="(row: any) => row.id"
        :single-line="false"
        :striped="true"
        class="problem-table"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useContestProblems } from '@/composables/oj/useContestProblems';
import { useUserStore } from '@/stores/userStore';
import { renderStatusIcon } from '@/utils/statusUtils';
import type { ContestDetail } from '@/composables/oj/useContestDetail';
import type { ContestProblemRow } from '@/composables/oj/useContestProblems';

const props = defineProps<{ detail: ContestDetail }>();

const router = useRouter();
const userStore = useUserStore();

const { loading, error, problems, fetchContestProblems } = useContestProblems();

// 比赛题目内部 ID 已由 composable 经 checkProblem 换成展示编号，
// 导航时带上 cid，提交会携带 contestId
const handleProblemClick = (row: ContestProblemRow) => {
  if (!row.problemCode) return;
  router.push({
    path: `/problem/${row.problemCode}`,
    query: props.detail.id ? { cid: props.detail.id } : undefined,
  });
};

const columns = [
  {
    title: 'Solved',
    key: 'status',
    width: 80,
    align: 'center' as const,
    render(row: ContestProblemRow) {
      return renderStatusIcon(userStore.getProblemStatus(row.problemCode));
    }
  },
  {
    title: '#',
    key: 'displayId',
    width: 80,
    align: 'center' as const,
    render: (row: ContestProblemRow) =>
      h('span', { style: 'font-weight: bold; color: #333;' }, row.displayId || '-')
  },
  {
    title: 'Title',
    key: 'title',
    render(row: ContestProblemRow) {
      return h('a', {
        style: {
          textDecoration: 'none',
          color: '#2080f0',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: '16px',
        },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          handleProblemClick(row);
        }
      }, row.title || row.problemCode || '-');
    }
  },
  {
    title: '编号',
    key: 'problemCode',
    width: 140,
    align: 'center' as const,
    render: (row: ContestProblemRow) => row.problemCode || '-'
  }
];

watch(
  () => props.detail,
  (detail) => {
    if (detail?.id) {
      void fetchContestProblems(detail.problems ?? []);
    }
  },
  { immediate: true, deep: false },
);
</script>

<style scoped lang="less">
.contest-problems-container {
  width: 100%;
  box-sizing: border-box;
  padding: 0 16px;

  @media (min-width: 1200px) {
    padding: 0 48px;
  }
}

.table-card {
  background: #fff;
  border-radius: 4px;
}

:deep(.problem-table) {
  .n-data-table-th {
    background-color: #fafafc;
    font-weight: bold;
    font-size: 15px;
    height: 48px;
  }
  &.n-data-table--striped .n-data-table-tr:nth-child(2n) .n-data-table-td {
    background-color: #fafafa;
  }
}
</style>
