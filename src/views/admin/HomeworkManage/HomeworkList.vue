<template>
  <div class="homework-list-container">
    <n-card :bordered="false">
      <div class="header">
        <div class="title">作业列表</div>
        <n-button type="primary" @click="router.push({ name: 'AdminHomeworkAdd' })">
          添加作业
        </n-button>
      </div>
      
      <n-space vertical :size="16">
        <div class="search-bar">
          <n-input-group>
            <n-input v-model:value="searchKeyword" placeholder="搜索作业..." @keyup.enter="handleSearch" />
            <n-button type="primary" @click="handleSearch">
              搜索
            </n-button>
          </n-input-group>
        </div>

        <n-data-table
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :pagination="pagination"
          :row-key="(row) => row.id"
          :scroll-x="1200"
        />
      </n-space>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NSpace, NInput, NInputGroup, NDataTable } from 'naive-ui';
import { useHomeworkList } from '@/composables/admin/useHomeworkManage';

const router = useRouter();
const {
  loading,
  tableData,
  pagination,
  columns,
  searchKeyword,
  handleSearch,
  fetchHomeworks
} = useHomeworkList();

onMounted(() => {
  fetchHomeworks();
});
</script>

<style scoped lang="less">
.homework-list-container {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .title {
      font-size: 18px;
      font-weight: bold;
      border-left: 4px solid #007BFF;
      padding-left: 8px;
    }
  }

  .search-bar {
    width: 300px;
  }
}
</style>
