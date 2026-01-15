<template>
  <div class="contest-problems-container">
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
import { h, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContestProblems } from '@/composables/oj/useContestProblems';
import { useUserStore } from '@/stores/userStore';
import { renderStatusIcon } from '@/utils/statusUtils';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const { loading, problems, fetchContestProblems, getProblemIndex } = useContestProblems();

const handleProblemClick = (pid: string) => {
  router.push(`/problem/${pid}`);
};

const columns = [
  {
    title: 'Solved',
    key: 'status',
    width: 80,
    align: 'center' as const,
    render(row: any) {
      return renderStatusIcon(userStore.getProblemStatus(row.id));
    }
  },
  {
    title: '#',
    key: 'index',
    width: 80,
    align: 'center' as const,
    render: (_: any, index: number) => h('span', { style: 'font-weight: bold; color: #333;' }, getProblemIndex(index))
  },
  {
    title: 'Title',
    key: 'title',
    render(row: any) {
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
          handleProblemClick(row.id);
        }
      }, row.title);
    }
  },
  {
    title: 'Ratio (AC / Submit)',
    key: 'ratio',
    width: 200,
    align: 'right' as const,
    render(row: any) {
      const ratio = row.submitted === 0 ? 0 : (row.accepted / row.submitted * 100).toFixed(1);
      return `${ratio}% (${row.accepted} / ${row.submitted})`;
    }
  }
];

onMounted(() => {
  const cid = route.params.contestId as string;
  fetchContestProblems(cid);
});
</script>

<style scoped lang="less">
.contest-problems-container {
  // 响应式边距：默认有点边距，大屏更宽
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