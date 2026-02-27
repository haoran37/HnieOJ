<template>
  <div class="status-page-container">
    
    <n-card :bordered="false" size="small" class="filter-card">
      <div class="filter-row">
        <n-button secondary circle size="small" class="refresh-btn" aria-label="刷新状态列表" @click="handleRefresh">
          <template #icon><n-icon><RefreshIcon /></n-icon></template>
        </n-button>

        <div class="filter-inputs">
          <n-input 
            v-model:value="filters.problem" 
            placeholder="题目 ID / 名称" 
            size="small" 
            clearable
            style="width: 180px"
          />
          <n-input 
            v-model:value="filters.user" 
            placeholder="学号 / 用户名" 
            size="small" 
            clearable
            style="width: 180px"
          />
          <n-select 
            v-model:value="filters.language" 
            :options="langOptions" 
            placeholder="语言" 
            size="small" 
            clearable 
            style="width: 120px"
          />
          <n-select 
            v-model:value="filters.status" 
            :options="statusOptions" 
            placeholder="状态" 
            size="small" 
            clearable 
            style="width: 200px"
          />
        </div>

        <n-button type="primary" size="small" @click="handleSearch">
          <template #icon><n-icon><SearchIcon /></n-icon></template>
          搜索
        </n-button>
      </div>
    </n-card>

    <div class="table-wrapper">
      <n-card :bordered="false" content-style="padding: 0;">
        <n-data-table
          :columns="columns"
          :data="listData"
          :loading="loading"
          :row-key="(row: { id: string | number }) => row.id"
          :striped="true" 
          :single-line="false"
          size="small"
          class="status-table"
        />
        
        <div class="pagination-bar">
          <n-pagination
            v-model:page="page"
            :page-count="Math.ceil(total / pageSize)"
            :page-slot="7"
            @update:page="handlePageChange"
          >
            <template #prefix>共 {{ total }} 条记录</template>
          </n-pagination>
        </div>
      </n-card>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { 
  RefreshOutline as RefreshIcon, 
  SearchOutline as SearchIcon 
} from '@vicons/ionicons5';
import { useStatusList } from '@/composables/oj/useStatusList';
import { createStatusColumns } from '@/utils/statusColumns';

const { 
  loading, listData, total, page, pageSize, filters, 
  fetchStatus, handlePageChange, handleSearch, handleRefresh 
} = useStatusList();

const router = useRouter();
const columns = createStatusColumns(router);

// 静态选项
const langOptions = [
  { label: 'C', value: 'C' },
  { label: 'C++', value: 'CPP' },
  { label: 'Java', value: 'Java' },
  { label: 'Python3', value: 'Python3' },
  { label: 'Go', value: 'Go' }
];

const statusOptions = [
  { label: 'Accepted', value: 'Accepted' },
  { label: 'Wrong Answer', value: 'Wrong Answer' },
  { label: 'Time Limit Exceeded', value: 'Time Limit Exceeded' },
  { label: 'Memory Limit Exceeded', value: 'Memory Limit Exceeded' },
  { label: 'Compilation Error', value: 'Compilation Error' },
  { label: 'Runtime Error', value: 'Runtime Error' }
];

onMounted(() => {
  fetchStatus();
});
</script>

<style scoped lang="less">
.status-page-container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  .filter-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .refresh-btn {
    flex-shrink: 0;
  }

  .filter-inputs {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.table-wrapper {
  .pagination-bar {
    display: flex;
    justify-content: flex-end;
    padding: 12px 16px;
    border-top: 1px solid #efeff5;
  }
}

// 优化表格样式
:deep(.status-table) {
  .n-data-table-th {
    background-color: #FAFAFC; 
    font-weight: 600;
    color: #333;
  }
  
  .n-data-table-td {
    padding: 8px 12px;
  }

   &.n-data-table--striped .n-data-table-tr:nth-child(2n) .n-data-table-td {
    background-color: #fafbfc;
  }
}
</style>
