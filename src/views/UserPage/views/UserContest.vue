<template>
  <div class="user-list-page">
    <div class="section">
      <div class="list-header"><h3>参加的比赛</h3></div>
      <div class="list-content">
        <ContestItem 
          v-for="c in joinedContests" :key="c.id"
          v-bind="c"
          @click="handleItemClick(c.id)"
        />
      </div>
    </div>

    <n-divider />

    <div class="section">
      <div class="list-header"><h3>关注的比赛</h3></div>
      <div class="list-content">
        <ContestItem 
          v-for="c in followedContests" :key="c.id"
          v-bind="c"
          @click="handleItemClick(c.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ContestItem from '@/components/ContestItem.vue';

const router = useRouter();

//TODO: 从后端获取数据
const joinedContests = ref([
  { id: "1001", title: 'HNIE 第 20 届程序设计校赛', tags: ['校赛', 'ICPC规则'], source: 'HNIE OJ', beginTime: '2025-05-20 12:00', endTime: '2025-05-20 17:00', participantCount: 113, showFollow: false }
]);

const followedContests = ref([
  { id: "1002", title: 'Codeforces Round #999 (Div. 2)', tags: ['CF', 'Rated'], source: 'Codeforces', beginTime: '2025-06-01 22:35', endTime: '2025-06-02 00:35', participantCount: 15000, showFollow: true }
]);

const handleItemClick = (id: string) => {
  router.push(`/contest/${id}`);
};
</script>

<style scoped lang="less">
.user-list-page { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.list-header { margin-bottom: 16px; border-left: 4px solid #f0a020; padding-left: 12px; }
.list-content { display: flex; flex-direction: column; gap: 16px; }
</style>