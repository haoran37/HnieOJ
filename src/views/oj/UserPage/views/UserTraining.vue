<template>
  <div class="user-list-page">
    
    <div class="section">
      <div class="list-header green"><h3>收藏的题单</h3></div>
      <n-data-table :columns="columns" :data="favData" :bordered="false" size="small" />
    </div>

    <n-divider />

    <div class="section">
      <div class="list-header blue"><h3>分享的题单</h3></div>
      <n-data-table :columns="columns" :data="shareData" :bordered="false" size="small" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { useRouter } from 'vue-router';
import { NProgress, NRate } from 'naive-ui';

const router = useRouter();

const columns = [
  { title: '编号', key: 'id', width: 80 },
  { 
    title: '名称', 
    key: 'title', 
    render: (row: any) => h(
      'a',
      { 
        style: 'color: #2080f0; cursor: pointer; font-weight: 500',
        onClick: () => router.push(`/training/${row.id}`)
      }, 
      row.title
    ) 
  },
  { 
    title: '完成度', 
    key: 'progress', 
    width: 180, 
    render: (row: any) => h(NProgress, { 
      percentage: row.progress, 
      height: 10, 
      type: 'line', 
      color: row.progress === 100 ? '#18a058' : '#2080f0' 
    }) 
  },
  { 
    title: '评分', 
    key: 'rate', 
    width: 140, 
    render: (row: any) => h(NRate, { 
      readonly: true, 
      defaultValue: row.rate, 
      size: 'small', 
      allowHalf: true 
    }) 
  },
  { 
    title: '创建者', 
    key: 'creator', 
    width: 120, 
    render: (row: any) => h('span', { style: 'color: #666' }, row.creator) 
  }
];

//TODO: 从后端获取数据
const favData = [
  { id: "1001", title: '【官方】算法入门第 100 阶段', progress: 27.3, rate: 4, creator: 'HNIE OJ' },
  { id: "1002", title: '【官方】算法入门第 101 阶段', progress: 100, rate: 5, creator: 'HNIE OJ' },
];

const shareData = [
  { id: "2001", title: '动态规划经典50题', progress: 12.0, rate: 4.5, creator: 'MyUserAccount' },
  { id: "2002", title: '图论基础模板题', progress: 0, rate: 0, creator: 'MyUserAccount' },
];
</script>

<style scoped lang="less">
.user-list-page { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.list-header { 
  margin-bottom: 16px; padding-left: 12px; 
  &.green { border-left: 4px solid #18a058; }
  &.blue { border-left: 4px solid #2080f0; }
  h3 { margin: 0; font-size: 16px; color: #333; }
}
</style>
