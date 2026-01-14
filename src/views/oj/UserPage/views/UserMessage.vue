<template>
  <div class="user-list-page">
    <n-alert title="消息概览" type="info" style="margin-bottom: 20px">
      当前未读：<strong style="color: #d03050">3</strong> 条，最近新增：系统通知
    </n-alert>
    
    <div class="list-header"><h3>消息列表</h3></div>
    
    <n-data-table :columns="columns" :data="data" :bordered="false" />
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { NTag } from 'naive-ui';

const columns = [
  { title: '序号', key: 'id', width: 60 },
  { title: '标题', key: 'title', render: (row: any) => h('a', { style: 'font-weight: 500' }, row.title) },
  { title: '来源', key: 'source', render: (row: any) => h(NTag, { type: 'info', size: 'small', bordered: false }, { default: () => row.source }) },
  { title: '时间', key: 'time', width: 180 },
];

//TODO: 从后端获取数据
const data = [
  { id: 1, title: '您的题解已被采纳', source: '系统', time: '2025-03-30 14:00' },
  { id: 2, title: 'Newbie_Coder 回复了您的讨论', source: '讨论', time: '2025-03-29 10:30' },
  { id: 3, title: '作业截止提醒', source: '课程', time: '2025-03-28 09:00' },
];
</script>

<style scoped lang="less">
.user-list-page { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.list-header { margin-bottom: 16px; border-left: 4px solid #2080f0; padding-left: 12px; }
</style>