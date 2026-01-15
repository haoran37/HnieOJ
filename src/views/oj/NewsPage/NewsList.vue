<template>
  <div class="news-list-container">
    
    <div class="page-header-card">
      <div class="header-content">
        <h1 class="page-title">新闻公告</h1>
        <n-button 
          v-if="userStore.isAdmin" 
          type="primary" 
          class="add-btn"
          @click="handleAddNews"
        >
          <template #icon><n-icon><AddIcon /></n-icon></template>
          发布新闻
        </n-button>
      </div>
    </div>

    <n-card :bordered="false" class="list-card">
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
import { NTag, useMessage } from 'naive-ui';
import { AddOutline as AddIcon, Flame as HotIcon } from '@vicons/ionicons5';
import { useNewsList } from '@/composables/oj/useNewsList';
import { useUserStore } from '@/stores/userStore';

const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const { 
  loading, newsList, total, page, pageSize, 
  fetchNews, handlePageChange 
} = useNewsList();

const handleAddNews = () => {
  //TODO: 跳转到发布页面或弹出模态框
  message.info('点击了发布新闻按钮（功能开发中）');
  // router.push('/news/create'); 
};

const columns = [
  {
    title: '序号',
    key: 'index',
    width: 80,
    align: 'center' as const,
    render: (_: any, index: number) => (page.value - 1) * pageSize.value + index + 1
  },
  {
    title: '标题',
    key: 'title',
    render(row: any) {
      const nodes = [];
      if (row.isTop) {
        nodes.push(h(NTag, { type: 'error', size: 'small', bordered: false, style: { marginRight: '8px', fontWeight: 'bold' } }, { default: () => '置顶' }));
      }
      nodes.push(h('a', {
        class: 'news-link',
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          router.push(`/news/${row.id}`);
        }
      }, row.title));
      if (row.viewCount > 500) {
        nodes.push(h('span', { style: { marginLeft: '8px', color: '#d03050', display: 'inline-flex', alignItems: 'center', fontSize: '12px' } }, [
          h(HotIcon, { style: { width: '14px', marginRight: '2px' } }),
          row.viewCount
        ]));
      }
      return h('div', { style: { display: 'flex', alignItems: 'center' } }, nodes);
    }
  },
  {
    title: '发布时间',
    key: 'createTime',
    width: 150,
    align: 'right' as const,
    render: (row: any) => h('span', { style: { color: '#999', fontFamily: 'monospace' } }, row.createTime)
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