<template>
  <BoardCard title="公告">
    <template #icon>
      <n-icon size="22"><MegaphoneIcon /></n-icon>
    </template>
    
    <template #extra>
      <n-button 
        text 
        size="tiny" 
        type="primary" 
        color="#007bff"
        @click="$router.push('/news')"
      >
        View all »
      </n-button>
    </template>

    <n-data-table 
      class="custom-announcement-table"
      :bordered="false"
      :columns="columns" 
      :data="newsList" 
      :loading="loading"
      :pagination="pagination"
      :row-key="(row: any) => row.id"
      size="small"
    />
  </BoardCard>
</template>

<script lang="ts" setup name="AnnouncementCard">
import { h, onMounted, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MegaphoneOutline as MegaphoneIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';
import { useNewsList } from '@/composables/oj/useNewsList';

const router = useRouter();
const { loading, newsList, total, page, pageSize, fetchNews, handlePageChange } = useNewsList();

pageSize.value = 3;

const columns = [
  {
    title: 'Title',
    key: 'title',
    render(row: any) {
      return h(
        'a',
        {
          href: `/news/${row.id}`,
          style: {
            color: '#007bff',
            cursor: 'pointer',
            textDecoration: 'none',
            fontWeight: '500'
          },
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            router.push(`/news/${row.id}`);
          }
        },
        row.title
      );
    }
  },
  {
    title: 'Date',
    key: 'createTime',
    width: 120,
    render: (row: any) => h('span', { style: 'color: #666' }, row.createTime)
  },
];

const pagination = reactive({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  
  showSizePicker: true, 
  pageSizes: [3, 5, 7], 
  
  prefix: () => '', 
  
  onChange: (p: number) => {
    pagination.page = p;
    handlePageChange(p);
  },

  onUpdatePageSize: (size: number) => {
    pageSize.value = size;
    pagination.pageSize = size;
    pagination.page = 1;
    page.value = 1;
    fetchNews();
  }
});

watch([page, pageSize, total], ([newPage, newPageSize, newTotal]) => {
  pagination.page = newPage;
  pagination.pageSize = newPageSize;
  pagination.itemCount = newTotal;
});

onMounted(() => {
  fetchNews();
});
</script>

<style scoped lang="less">
:deep(.custom-announcement-table) {
  background-color: transparent;

  .n-data-table-th {
    background-color: #fff;
    font-weight: 800;
    font-size: 16px;
    color: #000;
    border-bottom: 2px solid #333;
    padding-bottom: 8px;
  }

  .n-data-table-td {
    background-color: #fff;
    padding: 12px 8px;
    border-bottom: 1px solid #eee;
  }

  .n-data-table-tr:hover .n-data-table-td {
    background-color: #f9f9f9;
  }
}
</style>