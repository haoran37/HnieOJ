<template>
  <BoardCard title="公告">
    <template #icon>
      <n-icon size="22"><MegaphoneIcon /></n-icon>
    </template>
    
    <template #extra>
      <n-button text size="tiny" type="primary" color="#007bff">View all »</n-button>
    </template>

    <n-data-table 
      class="custom-announcement-table"
      :bordered="false"
      :columns="columns" 
      :data="data" 
      :pagination="pagination"
      size="small"
    />
  </BoardCard>
</template>

<script lang="ts" setup name="AnnouncementCard">
import BoardCard from '@/components/BoardCard.vue';
import { MegaphoneOutline as MegaphoneIcon } from '@vicons/ionicons5'
import { reactive, h } from 'vue';

// TODO: 从后端获取真实公告数据并实现标签跳转
const columns = [
  {
    title: 'Title',
    key: 'title',
    // 渲染函数：让标题颜色变成蓝色 link 风格
    render(row: any) {
      return h('span', { style: 'color: #007bff; cursor: pointer;' }, row.title)
    }
  },
  {
    title: 'Data',
    key: 'date',
    width: 120,
  },
];

const data = reactive([
  { title: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', date: 'XXXX-XX-XX' },
  { title: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', date: 'XXXX-XX-XX' },
  { title: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', date: 'XXXX-XX-XX' },
  { title: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', date: 'XXXX-XX-XX' },
  { title: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', date: 'XXXX-XX-XX' },
]);

const pagination = reactive({
  page: 1,
  pageSize: 3,
  showSizePicker: true,
  pageSizes: [3, 5, 7],
  onChange: (page: number) => {
    pagination.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
  }
})
</script>

<style scoped lang="less">
:deep(.custom-announcement-table) {
  background-color: transparent;

  // 表头样式
  .n-data-table-th {
    background-color: #fff;
    font-weight: 800;
    font-size: 16px;
    color: #000;
    border-bottom: 2px solid #333;
    padding-bottom: 8px;
  }

  //单元格样式
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