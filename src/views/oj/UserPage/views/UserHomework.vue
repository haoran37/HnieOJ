<template>
  <div class="user-list-page">
    <div class="list-header">
      <h3>我的作业</h3>
    </div>
    <div class="list-content">
      <ContestItem 
        v-for="hw in homeworkList" 
        :key="hw.id"
        :title="hw.title"
        :tags="hw.tags"
        :source="hw.source"
        :begin-time="hw.beginTime"
        :end-time="hw.endTime"
        :participant-count="hw.count"
        :compact="false"
        :show-follow="false"
        @click="handleItemClick(hw.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ContestItem from '@/components/ContestItem.vue';

const router = useRouter();

//TODO: 从后端获取数据
const homeworkList = ref([
  { id: "1001", title: '2025春季算法期中作业', tags: ['必做', '平时分'], source: '信息科学与工程学院·计算机2202·某某某', beginTime: '2026-01-01 08:00', endTime: '2026-04-07 23:59', count: 45 },
  { id: "1002", title: '数据结构第三次实验', tags: ['必做', '平时分'], source: '信息科学与工程学院·计算机2202·某某某', beginTime: '2026-01-12 14:00', endTime: '2026-03-20 18:00', count: 52 },
]);

const handleItemClick = (id: string) => {
  router.push(`/homework/${id}`);
};
</script>

<style scoped lang="less">
.user-list-page {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.list-header {
  margin-bottom: 16px;
  border-left: 4px solid #2080f0;
  padding-left: 12px;
}
.list-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>