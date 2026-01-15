<template>
  <div class="training-list-container">
    
    <div class="filter-section">
      <n-card :bordered="false" size="small">
        
        <div class="search-row">
          <div class="search-input-group">
            <span class="label fixed-label">查找题单</span>
            <n-input-group>
              <n-input 
                v-model:value="searchParams.keyword" 
                placeholder="输入题单名称关键词..." 
                clearable
                @keydown.enter="handleSearch"
                style="width: 300px"
              />
              <n-button type="primary" @click="handleSearch">
                搜索
              </n-button>
            </n-input-group>
          </div>
        </div>

        <div class="type-row">
          <span class="label fixed-label">题单类型</span>
          <div class="type-tags">
            <n-tag 
              :type="searchParams.type === 'OFFICIAL' ? 'primary' : 'default'"
              :checked="searchParams.type === 'OFFICIAL'"
              clickable
              class="type-tag"
              @click="toggleType('OFFICIAL')"
            >
              官方精选
            </n-tag>
            <n-tag 
              :type="searchParams.type === 'USER' ? 'primary' : 'default'"
              :checked="searchParams.type === 'USER'"
              clickable
              class="type-tag"
              @click="toggleType('USER')"
            >
              用户分享
            </n-tag>
          </div>
        </div>

        <div class="divider"></div>
        <div class="result-info">
          共计 <span class="count">{{ total }}</span> 条结果
        </div>

      </n-card>
    </div>

    <div class="table-wrapper">
      <n-card :bordered="false" content-style="padding: 0; display: flex; flex-direction: column; height: 100%;">
        <div class="table-scroll-area">
          <n-data-table
            :columns="columns"
            :data="tableData"
            :loading="loading"
            :row-key="(row: any) => row.id"
            :bordered="true"           
            :single-line="false"       
            :single-column="false"     
            class="custom-table"
          />
        </div>

        <div class="pagination-bar">
          <n-pagination
            v-model:page="page"
            :page-count="Math.ceil(total / pageSize)"
            :page-slot="7"
            @update:page="handlePageChange"
          >
            <template #prefix>
              <div class="pagination-prefix">共 {{ total }} 个题单</div>
            </template>
          </n-pagination>
        </div>
      </n-card>
    </div>

  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTrainingList } from '@/composables/oj/useTrainingList';
import { createTrainingColumns } from '@/utils/trainingColumns';

const router = useRouter();
const { 
  tableData, loading, total, page, pageSize, searchParams,
  fetchTrainingSheets, handlePageChange, handleSearch, toggleType 
} = useTrainingList();

const handleTitleClick = (id: string) => {
  router.push(`/training/${id}`);
};

const columns = createTrainingColumns(handleTitleClick);

onMounted(() => {
  fetchTrainingSheets();
});
</script>

<style scoped lang="less">
.training-list-container {
  display: flex;
  flex-direction: column;
  height: 100%; 
  gap: 16px;
}

.filter-section {
  flex-shrink: 0;
  
  .fixed-label {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin-right: 12px;
    white-space: nowrap; 
    flex-shrink: 0;
  }

  .search-row {
    margin-bottom: 12px;
    .search-input-group {
      display: flex;
      align-items: center;
    }
  }

  .type-row {
    display: flex;
    align-items: center;
    .type-tags {
      display: flex;
      gap: 12px;
      .type-tag {
        cursor: pointer;
        padding: 0 16px;
        height: 28px;
        line-height: 28px;
        font-size: 14px;
      }
    }
  }

  .divider {
    height: 1px;
    background-color: #efeff5;
    margin: 16px 0 12px 0;
  }

  .result-info {
    font-size: 14px;
    color: #666;
    .count {
      font-weight: bold;
      color: #333;
      margin: 0 4px;
    }
  }
}

.table-wrapper {
  flex: 1;
  min-height: 0; 
  
  .table-scroll-area {
    flex: 1;
    overflow-y: auto;
  }

  .pagination-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    background: #fff;
    border-top: 1px solid #efeff5;
  }
}

:deep(.custom-table) {
  .n-data-table-th {
    border-right: 1px solid rgba(239, 239, 245, 1);
    font-weight: bold;
    background-color: #fafafc;
  }
  .n-data-table-td {
    border-right: 1px solid rgba(239, 239, 245, 1);
    border-bottom: 1px solid rgba(239, 239, 245, 1);
  }
}
</style>