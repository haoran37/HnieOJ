<template>
  <div class="training-problems-view">
    <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
      {{ error }}
      <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="retry">
        重试
      </n-button>
    </n-alert>
    <n-data-table
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :row-key="(row: any) => row.id"
      :bordered="false"
      class="custom-table"
    />
    
    <div class="pagination-bar">
      <n-pagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        @update:page="onPageUpdate" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTrainingProblems } from '@/composables/oj/useTrainingProblems';
import type { TrainingProblemRow } from '@/composables/oj/useTrainingProblems';
import { renderStatusIcon } from '@/utils/statusUtils';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const {
  loading,
  error,
  tableData,
  total,
  page,
  pageSize,
  fetchProblemsInTraining,
  handlePageChange
} = useTrainingProblems();

const handleProblemClick = (problemCode: string) => {
  if (!problemCode) return;
  router.push(`/problem/${problemCode}`);
};

const retry = () => {
  void fetchProblemsInTraining(String(route.params.trainingId));
};

const onPageUpdate = (p: number) => {
  handlePageChange(p, String(route.params.trainingId));
};

// 题单接口只给内部 problemId，展示编号经 checkProblem 解析
const columns = [
  {
    title: '状态',
    key: 'status',
    width: 80,
    align: 'center' as const,
    render: (row: TrainingProblemRow) => renderStatusIcon(userStore.getProblemStatus(row.problemCode))
  },
  { title: '序号', key: 'displayId', width: 80, align: 'center' as const },
  {
    title: '标题',
    key: 'title',
    render(row: TrainingProblemRow) {
      return h('a', {
        style: { textDecoration: 'none', color: '#2080f0', fontWeight: '500', cursor: 'pointer' },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          handleProblemClick(row.problemCode);
        }
      }, row.title || row.problemCode || '-');
    }
  },
  {
    title: '编号',
    key: 'problemCode',
    width: 140,
    align: 'center' as const,
    render: (row: TrainingProblemRow) => row.problemCode || '-'
  }
];

onMounted(() => {
  const tid = route.params.trainingId as string;
  fetchProblemsInTraining(tid);
});

// 同一路由记录换 trainingId 时子组件会被复用，onMounted 不再触发；
// 必须监听路由 ID、回到第 1 页并按新题单重新查询（响应次序由 composable 保证）。
watch(
  () => route.params.trainingId,
  (tid) => {
    if (!tid) return;
    page.value = 1;
    void fetchProblemsInTraining(String(tid));
  },
);
</script>

<style scoped lang="less">
.training-problems-view {
  min-height: 400px;
}
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
:deep(.custom-table) {
  .n-data-table-th { background-color: #fafafc; font-weight: bold; }
}
</style>