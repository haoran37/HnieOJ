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

      <n-space vertical :size="16">
        <n-input-group class="search-bar">
          <n-input v-model:value="searchKeyword" placeholder="搜索题单..." @keyup.enter="handleSearch" />
          <n-button type="primary" @click="handleSearch">搜索</n-button>
        </n-input-group>

        <n-data-table
          remote
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :pagination="pagination"
          :scroll-x="1200"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
          class="training-table"
        />
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AddOutline } from '@vicons/ionicons5';
import { NButton, NCard, NDataTable, NInput, NInputGroup, NSpace } from 'naive-ui';
import { useTrainingManage } from '@/composables/admin/useTrainingManage';

const router = useRouter();
const {
  loading,
  tableData,
  pagination,
  columns,
  searchKeyword,
  handleSearch,
  handlePageChange,
  handlePageSizeChange,
  fetchTrainings
} = useTrainingManage();

onMounted(() => {
  fetchTrainings();
});
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

.search-bar {
  width: 300px;
}
</style>
