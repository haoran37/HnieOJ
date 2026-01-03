<template>
  <div class="problem-table-container">
    <n-card :bordered="false" content-style="padding: 0;">
      <n-data-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :row-key="row => row.id"
        :bordered="false"
        :single-line="false"
        class="custom-table"
      />

      <div class="pagination-bar">
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          :page-slot="7"
          @update:page="handlePageChange"
        >
          <template #prefix>
            <div class="pagination-prefix">
              共 {{ total }} 条题目
            </div>
          </template>
        </n-pagination>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted } from 'vue';
import { NTag, NRate, NProgress, NIcon, NDataTable, NCard, NPagination, NSpace } from 'naive-ui';
import { CheckmarkCircle as CheckIcon, CloseCircle as CloseIcon, Remove as TodoIcon } from '@vicons/ionicons5';
import { storeToRefs } from 'pinia';
import { useProblemStore } from '@/stores/problemStore';
import { useUserStore } from '@/stores/userStore';
import { stringToColor, stringToTextColor } from '@/utils/colorUtils';

// 题目数据类型定义
interface ProblemRecord {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  passRate: number;
  rate: string | number;
}

const problemStore = useProblemStore();
const userStore = useUserStore();
const { tableData, loading, total, page, pageSize } = storeToRefs(problemStore);
const { updateSearch, handlePageChange, fetchProblems } = problemStore;

const difficultyColors: Record<string, string> = {
  '入门': '#FE4C61',
  '简单': '#F39C11',
  '普及-': '#FFC116',
  '普及/提高-': '#52C41A',
  '困难': '#3498DB',
};

// 表格列定义
const columns = [
  {
    title: '状态',
    key: 'status',
    width: 60,
    align: 'center' as const,
    render(row: ProblemRecord) {
      const status = userStore.getProblemStatus(row.id);
      if (status === 'AC') return h(NIcon, { size: 20, color: '#18a058' }, { default: () => h(CheckIcon) });
      if (status === 'WA') return h(NIcon, { size: 20, color: '#d03050' }, { default: () => h(CloseIcon) });
      return h(NIcon, { size: 20, color: '#ccc' }, { default: () => h(TodoIcon) });
    }
  },
  {
    title: '题号',
    key: 'id',
    width: 100,
    render: (row: ProblemRecord) => h('span', { style: 'font-weight: 500' }, `P${row.id}`)
  },
  {
    title: '题目名称',
    key: 'title',
    render(row: ProblemRecord) {
      return h('a', {
        href: `/problem/${row.id}`,
        style: { textDecoration: 'none', color: '#2080f0', fontWeight: 'bold' },
        onClick: (e: MouseEvent) => e.preventDefault()
      }, row.title);
    }
  },
  {
    title: '标签',
    key: 'tags',
    render(row: ProblemRecord) {
      if (!row.tags?.length) return null;
      return h(NSpace, { size: [4, 4] }, {
        default: () => row.tags.map(tag => h(NTag, {
          bordered: false, size: 'small',
          color: { color: stringToColor(tag), textColor: stringToTextColor(tag), borderColor: 'transparent' },
          style: { borderRadius: '4px', padding: '0 8px' }
        }, { default: () => tag }))
      });
    }
  },
  {
    title: '难度',
    key: 'difficulty',
    width: 100,
    render(row: ProblemRecord) {
      const color = difficultyColors[row.difficulty] || '#999';
      return h(NTag, {
        color: { color, textColor: '#fff', borderColor: color },
        style: { borderRadius: '4px'},
        size: 'small'
      }, { default: () => row.difficulty });
    }
  },
  {
    title: '通过率',
    key: 'passRate',
    width: 150,
    render: (row: ProblemRecord) => h(NProgress, {
      type: 'line', percentage: row.passRate, indicatorPlacement: 'inside',
      color: row.passRate > 50 ? '#18a058' : '#f0a020', height: 18, borderRadius: 4
    })
  },
  {
    title: '评分',
    key: 'rate',
    width: 150,
    render: (row: ProblemRecord) => h(NRate, {
      readonly: true, defaultValue: Number(row.rate), allowHalf: true, size: 'small'
    })
  }
];

onMounted(() => {
  fetchProblems();
});
</script>

<style scoped lang="less">
.problem-table-container {
  margin-top: 16px;
  :deep(.n-data-table .n-data-table-th) {
    background-color: #fafafc;
    font-weight: 600;
  }
}

// TODO: 实现Affix效果
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #efeff5;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.pagination-prefix {
  margin-right: 16px;
  color: #666;
  font-size: 14px;
}

:deep(.n-data-table .n-data-table-td) {
  padding: 12px 8px;
}
</style>