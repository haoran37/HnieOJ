<template>
  <div class="training-detail-container">
    <n-spin :show="loading">
      
      <n-card :bordered="false" class="header-card">
        <div class="header-content">
          <div class="title-section">
            <h1 class="training-title">
              <span class="tid">#{{ detail.id }}</span>
              {{ detail.title }}
            </h1>
          </div>

          <div class="stats-section">
            <div class="stat-item">
              <span class="value">{{ detail.problemCount }}</span>
              <span class="label">题目总数</span>
            </div>
            <div class="divider"></div>
            <div class="stat-item">
              <span class="value">{{ detail.favoriteCount }}</span>
              <span class="label">收藏人数</span>
            </div>
            
            <div class="action-item">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button 
                    circle 
                    secondary 
                    :type="detail.isFavorite ? 'warning' : 'default'"
                    @click="handleToggleFavorite"
                    class="fav-btn"
                  >
                    <template #icon>
                      <n-icon :component="detail.isFavorite ? StarFilled : StarOutline" />
                    </template>
                  </n-button>
                </template>
                {{ detail.isFavorite ? '取消收藏' : '收藏题单' }}
              </n-tooltip>
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
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useNotification } from 'naive-ui';
import { StarOutline, Star as StarFilled } from '@vicons/ionicons5';
import { useUserStore } from '@/stores/userStore';
import { useTrainingDetail } from '@/composables/useTrainingDetail';

const route = useRoute();
const router = useRouter();
const notification = useNotification();
const userStore = useUserStore();

const { loading, detail, fetchTrainingDetail } = useTrainingDetail();

const currentTab = computed(() => route.name as string);

const handleTabChange = (val: string) => {
  router.push({ name: val, params: { trainingId: detail.value.id } });
};

const handleToggleFavorite = () => {
  if (!userStore.isEmailBound) {
    notification.error({
      content: '操作失败',
      meta: '您尚未绑定邮箱，无法收藏。请前往个人中心设置。',
      duration: 3000
    });
    return;
  }
  
  detail.value.isFavorite = !detail.value.isFavorite;
  if (detail.value.isFavorite) {
    detail.value.favoriteCount++;
    notification.success({ content: '收藏成功', duration: 2000 });
  } else {
    detail.value.favoriteCount--;
    notification.info({ content: '已取消收藏', duration: 2000 });
  }
};

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