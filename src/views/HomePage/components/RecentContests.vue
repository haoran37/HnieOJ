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
          :compact="true"
          @click="handleJump"
        />
        <n-empty v-else description="暂无近期比赛" />
      </div>
    </n-spin>

    <div class="view-all-wrapper">
      <n-button text size="tiny" type="primary" color="#007bff" @click="handleViewAll">
        View all »
      </n-button>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { TrophyOutline as TrophyIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';
import ContestItem from '@/components/ContestItem.vue';

const router = useRouter();
const loading = ref(false);
const contest = ref<any>(null);

const fetchContest = async () => {
  loading.value = true;
  
  // TODO: 从后端获取最新的一场比赛数据
  setTimeout(() => {
    contest.value = {
      id: '1024',
      title: '第二十届湖南省大学生程序设计竞赛',
      tags: ['省赛', 'ICPC', '团队赛'], // 字符串数组
      source: 'HNCPC 组委会',
      beginTime: '2026-01-05T09:00:00',
      endTime: '2026-01-05T14:00:00',
      participantCount: 1250 // 报名人数
    };
    loading.value = false;
  }, 500);
};

const handleJump = () => {
  if (contest.value) {
    router.push(`/contest/${contest.value.id}`);
  }
};

const handleViewAll = () => {
  router.push('/contests');
};

onMounted(() => {
  fetchContest();
});
</script>

<style scoped lang="less">
.contests-content {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  :deep(.contest-item) {
    margin: 4px 0;
  }
}

.view-all-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
  padding-right: 4px;
}
</style>