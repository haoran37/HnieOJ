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
        <n-alert v-if="error" type="error" :bordered="false" style="margin: 12px 24px 0">
          {{ error }}
          <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="fetchTrainingSheets">
            重试
          </n-button>
        </n-alert>
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
import { onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useTrainingList } from '@/composables/oj/useTrainingList';
import { formatFullTime } from '@/composables/useTime';
import type { TrainingSheet } from '@/composables/oj/useTrainingList';

const router = useRouter();
const { 
  tableData, loading, error, total, page, pageSize, searchParams,
  fetchTrainingSheets, handlePageChange, handleSearch, toggleType 
} = useTrainingList();

const handleTitleClick = (id: string) => {
  router.push(`/training/${id}`);
};

// 仅渲染后端真实返回的字段（无收藏/评分/完成度接口）
const columns = [
  { title: '编号', key: 'id', width: 80, align: 'center' as const },
  {
    title: '名称',
    key: 'title',
    render(row: TrainingSheet) {
      return h('a', {
        style: { textDecoration: 'none', color: '#2080f0', fontWeight: 'bold', cursor: 'pointer' },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          handleTitleClick(row.id);
        }
      }, row.title);
    }
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
    align: 'center' as const,
    render: (row: TrainingSheet) => (row.type === 'OFFICIAL' ? '官方' : '用户')
  },
  { title: '题目数', key: 'problemCount', width: 100, align: 'center' as const },
  { title: '创建者', key: 'creator', width: 140 },
  {
    title: '创建时间',
    key: 'gmtCreate',
    width: 180,
    render: (row: TrainingSheet) => formatFullTime(row.gmtCreate)
  }
];

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