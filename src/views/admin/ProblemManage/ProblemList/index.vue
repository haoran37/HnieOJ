<template>
  <div class="problem-list-container">
    <n-card :bordered="false" class="main-card">
      <div class="header-row">
        <div class="title">题目列表</div>
        <div class="actions">
          <n-space>
            <n-input-group>
              <n-input v-model:value="searchKeyword" placeholder="输入题目或PID搜索" @keyup.enter="handleSearch" />
              <n-button type="primary" ghost @click="handleSearch">
                <template #icon><n-icon><SearchOutline /></n-icon></template>
              </n-button>
            </n-input-group>
            <n-select
              v-model:value="authFilter"
              :options="authFilterOptions"
              placeholder="可见范围"
              clearable
              style="width: 140px"
              @update:value="handleSearch"
            />
            <n-button @click="handleReset">重置</n-button>
            <n-button type="primary" @click="router.push({ name: 'AdminProblemAdd' })">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              添加
            </n-button>
          </n-space>
        </div>
      </div>

      <n-data-table
        remote
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll-x="1200"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        class="problem-table"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { AddOutline, SearchOutline } from '@vicons/ionicons5';
import { useProblemManage } from '@/composables/admin/useProblemManage';

const router = useRouter();
const {
  searchKeyword,
  authFilter,
  loading,
  tableData,
  pagination,
  columns,
  handleSearch,
  handleReset,
  handlePageChange,
  handlePageSizeChange,
} = useProblemManage();

const authFilterOptions = [
  { label: '公开', value: 1 },
  { label: '私有', value: 2 },
  { label: '赛用', value: 3 },
];
</script>

<style scoped lang="less">
.problem-list-container {
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
