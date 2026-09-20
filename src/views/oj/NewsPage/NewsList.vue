<template>
  <div class="news-list-container">
    
    <div class="page-header-card">
      <div class="header-content">
        <h1 class="page-title">新闻公告</h1>
      </div>
    </div>

    <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
      {{ error }}
      <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="fetchNews()">
        重试
      </n-button>
    </n-alert>

    <n-card :bordered="false" class="list-card">
      <n-space style="margin-bottom: 12px">
        <n-input
          v-model:value="keyword"
          placeholder="搜索新闻标题"
          style="width: 260px"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <n-button type="primary" @click="handleSearch">搜索</n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="newsList"
        :loading="loading"
        :row-key="(row: any) => row.id"
        :striped="true"
        size="large"
        class="news-table"
      />
      
      <div class="pagination-wrapper">
        <n-pagination
          v-model:page="page"
          :item-count="total"
          :page-size="pageSize"
          @update:page="handlePageChange"
        />
      </div>
    </n-card>

  </div>
</template>

<script setup lang="ts">
import { h, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNewsList } from '@/composables/oj/useNewsList';

const router = useRouter();

const {
  loading,
  error,
  newsList,
  total,
  page,
  pageSize,
  keyword,
  fetchNews,
  handleSearch,
  handlePageChange
} = useNewsList('NEWS');

const columns = [
  {
    title: '序号',
    key: 'index',
    width: 80,
    align: 'center' as const,
    render: (_: unknown, index: number) => (page.value - 1) * pageSize.value + index + 1
  },
  {
    title: '标题',
    key: 'title',
    render(row: { id: string; title: string }) {
      return h('a', {
        class: 'news-link',
        href: `/news/${row.id}`,
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          router.push(`/news/${row.id}`);
        }
      }, row.title);
    }
  },
  {
    title: '发布者',
    key: 'author',
    width: 160,
    align: 'left' as const
  },
  {
    title: '发布时间',
    key: 'createTime',
    width: 180,
    align: 'right' as const,
    render: (row: { createTime: string }) => h('span', { style: { color: '#999', fontFamily: 'monospace' } }, row.createTime)
  }
];

onMounted(() => {
  fetchNews();
});
</script>

<style scoped lang="less">
.news-list-container {
  // width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px 24px; 
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header-card {
  background: #fff;
  padding: 20px 24px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-left: 6px solid #2080f0;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.2;
  }

  .add-btn {
    box-shadow: 0 2px 8px rgba(32, 128, 240, 0.3);
  }
}

.list-card {
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  min-width: 500px;
}

:deep(.news-table) {
  .n-data-table-th {
    background-color: #fafafc;
    font-weight: 600;
    font-size: 15px;
  }
  
  .n-data-table-td {
    padding: 16px 12px;
    font-size: 15px;
  }

  .news-link {
    text-decoration: none;
    color: #333;
    cursor: pointer;
    transition: color 0.2s;
    font-weight: 500;

    &:hover {
      color: #2080f0;
      text-decoration: underline;
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 24px 0 12px;
}
</style>