<template>
  <BoardCard title="近期比赛">
    <template #icon>
      <n-icon size="20"><TrophyIcon /></n-icon>
    </template>

    <n-spin :show="loading">
      <div class="contests-content">
        <n-alert v-if="error" type="error" :bordered="false" size="small" style="margin-bottom: 8px">
          {{ error }}
          <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="fetchContest">
            重试
          </n-button>
        </n-alert>
        <ContestItem 
          v-if="contest" 
          v-bind="contest" 
          :compact="true"
          @click="handleJump"
        />
        <n-empty v-else-if="!error" description="暂无近期比赛" />
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
import { getContests } from '@/utils/api';

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const contest = ref<{
  id: string;
  title: string;
  tags: string[];
  source: string;
  beginTime: string;
  endTime: string;
  problemCount: number;
} | null>(null);

// 真实读取最近一场比赛（后端 /api/contests 按创建顺序分页）
const fetchContest = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await getContests(1, 1);
    const vo = result?.list?.[0];
    contest.value = vo
      ? {
          id: String(vo.id),
          title: vo.title,
          tags: vo.customTags ?? [],
          source: vo.source ?? '',
          beginTime: vo.startTime ?? '',
          endTime: vo.endTime ?? '',
          problemCount: vo.problemCount ?? 0,
        }
      : null;
  } catch (err) {
    contest.value = null;
    error.value = err instanceof Error ? err.message : '近期比赛加载失败';
  } finally {
    loading.value = false;
  }
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