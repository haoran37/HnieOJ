<template>
  <div class="training-problems-view">
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
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTrainingProblems } from '@/composables/useTrainingProblems';
import { createColumns } from '@/utils/problemColumns';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const { 
  loading, tableData, total, page, pageSize, 
  fetchProblemsInTraining, handlePageChange 
} = useTrainingProblems();

const handleProblemClick = (id: string) => {
  router.push(`/problem/${id}`);
};

const onPageUpdate = (p: number) => {
  // 直接使用 script 中的 route，比模板中的 $route 更安全
  handlePageChange(p, String(route.params.trainingId));
};

const columns = createColumns(
  (id) => userStore.getProblemStatus(id),
  handleProblemClick
);

onMounted(() => {
  const tid = route.params.trainingId as string;
  fetchProblemsInTraining(tid);
});
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