<template>
  <div class="training-list-container">
    <n-card :bordered="false" class="main-card">
      <div class="header-row">
        <div class="title">题单管理</div>
        <div class="actions">
          <n-button type="primary" @click="router.push({ name: 'AdminTrainingAdd' })">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            添加题单
          </n-button>
        </div>
      </div>

      <n-data-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll-x="1000"
        @update:page="handlePageChange"
        class="training-table"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { AddOutline } from '@vicons/ionicons5';
import { useTrainingManage } from '@/composables/admin/useTrainingManage';

const router = useRouter();
const {
  loading,
  tableData,
  pagination,
  columns,
  handlePageChange,
  fetchTrainings
} = useTrainingManage();

// Initial fetch
fetchTrainings();
</script>

<style scoped lang="less">
.training-list-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-card {
  display: flex;
  flex-direction: column;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .title {
    font-size: 18px;
    font-weight: bold;
    color: #333;
  }

  .actions {
    display: flex;
    align-items: center;
  }
}
</style>
