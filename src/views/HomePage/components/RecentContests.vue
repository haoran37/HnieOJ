<template>
  <BoardCard title="近期比赛">
    <template #icon>
      <n-icon size="20"><TrophyIcon /></n-icon>
    </template>

    <n-spin :show="loading">
      <div class="contests-content">
        <ContestItem 
          v-if="contest" 
          v-bind="contest" 
          @click="handleJump"
        />
        <n-empty v-else description="暂无近期比赛" />
      </div>
    </n-spin>

    <div class="view-all-wrapper">
      <n-button text type="info" size="small" @click="handleViewAll">
        View all ->
      </n-button>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { TrophyOutline as TrophyIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';
import ContestItem from '@/components/ContestItem.vue';

const loading = ref(false);
const contest = ref<any>(null);

  // TODO: 从后端获取真实比赛数据
const fetchContest = async () => {
  loading.value = true;
  // 模拟 API 返回的原始数据
  setTimeout(() => {
    contest.value = {
      title: '第二十届湖南省大学生程序设计竞赛',
      tagName: 'P1000',
      tagType: 'success',
      source: 'HNCPC 组委会',
      beginTime: '2026-01-01T20:00:00',
      endTime: '2026-01-01T22:00:00'
    };
    loading.value = false;
  }, 500);
};

const handleViewAll = () => console.log('View All');
const handleJump = () => console.log('Jump');

onMounted(fetchContest);
</script>

<style scoped lang="less">
.contests-content { min-height: 120px; }
.view-all-wrapper {
  display: flex; justify-content: flex-end; margin-top: 10px;
  :deep(.n-button) { font-size: 13px; font-weight: 500; color: #2080f0; }
}
</style>