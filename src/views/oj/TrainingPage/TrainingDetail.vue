<template>
  <div class="training-detail-container">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">{{ error }}</n-alert>
      
      <n-card :bordered="false" class="header-card">
        <div class="header-content">
          <div class="title-section">
            <h1 class="training-title">
              <span class="tid">#{{ detail.id }}</span>
              {{ detail.title }}
            </h1>
            <n-button size="small" :loading="favoriteLoading" @click="toggleFavorite">{{ isFavorite ? '取消收藏' : '收藏题单' }}</n-button>
          </div>

          <div class="stats-section">
            <div class="stat-item">
              <span class="value">{{ detail.problemCount }}</span>
              <span class="label">题目总数</span>
            </div>
            <div class="divider"></div>
            <div class="stat-item">
              <span class="value">{{ detail.type === 'OFFICIAL' ? '官方' : '用户' }}</span>
              <span class="label">题单类型</span>
            </div>
          </div>
        </div>
      </n-card>

      <div class="content-wrapper">
        <n-tabs 
          type="line" 
          :value="currentTab" 
          @update:value="handleTabChange"
          class="nav-tabs"
        >
          <n-tab name="TrainingInfo" tab="题单简介" />
          <n-tab name="TrainingProblems" tab="题目列表" />
        </n-tabs>

        <div class="tab-content">
          <router-view v-slot="{ Component }">
            <component :is="Component" :detail="detail" />
          </router-view>
        </div>
      </div>

    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTrainingDetail } from '@/composables/oj/useTrainingDetail';
import { useFavorite } from '@/composables/oj/useFavorite';

const route = useRoute();
const { saved: isFavorite, loading: favoriteLoading, toggle: toggleFavorite } = useFavorite('training', () => String(route.params.trainingId ?? ''));
const router = useRouter();

const { loading, error, detail, fetchTrainingDetail } = useTrainingDetail();

const currentTab = computed(() => route.name as string);

const handleTabChange = (val: string) => {
  router.push({ name: val, params: { trainingId: detail.value.id } });
};

// 同一路由记录换 trainingId 时组件会被复用，必须按新参数重取，避免展示上一题单
watch(
  () => route.params.trainingId,
  (tid) => {
    if (tid) void fetchTrainingDetail(String(tid));
  },
);

onMounted(() => {
  const tid = route.params.trainingId as string;
  fetchTrainingDetail(tid);
});
</script>

<style scoped lang="less">
.training-detail-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  border-radius: 4px;
  margin-bottom: 10px;
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .title-section {
      .training-title {
        margin: 0;
        font-size: 26px;
        color: #333;
        display: flex;
        align-items: baseline;
        gap: 12px;
        .tid {
          font-size: 26px;
          color: #666;
          font-weight: 500;
          font-family: monospace;
        }
      }
    }

    .stats-section {
      display: flex;
      align-items: center;
      gap: 24px;

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        .value { font-size: 20px; font-weight: bold; color: #333; line-height: 1.2; }
        .label { font-size: 12px; color: #999; }
      }

      .divider {
        width: 1px;
        height: 24px;
        background: #eee;
      }

      .fav-btn {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }
    }
  }
}

.content-wrapper {
  background: #fff;
  border-radius: 4px;
  min-height: 500px;
  padding: 0 20px 20px 20px;

  .nav-tabs {
    margin-bottom: 20px;
    :deep(.n-tabs-tab) {
      padding: 16px 20px;
      font-size: 15px;
    }
  }
}
</style>
