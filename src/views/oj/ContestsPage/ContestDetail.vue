<template>
  <div class="contest-detail-container">
    <n-spin :show="loading">
      
      <n-card :bordered="false" class="header-card" :style="{ borderLeft: `6px solid ${statusStyle.descColor}` }">
        <div class="header-content">
          <div class="title-section">
            <n-tag :color="{ color: statusStyle.header.backgroundColor, textColor: statusStyle.descColor, borderColor: 'transparent' }" size="small" style="margin-bottom: 8px;">
              {{ detail.type }} 赛制
            </n-tag>
            <h1 class="contest-title">{{ detail.title }}</h1>
            <div class="meta-info">
              <span><n-icon><PersonIcon/></n-icon>主办方: {{ detail.creator }}</span>
              <span><n-icon><TimeIcon/></n-icon>时长: {{ durationText }}</span>
            </div>
          </div>

          <div class="status-section" :style="{ color: statusStyle.descColor }">
            <div class="status-icon">
              <n-icon size="40">
                <TimerIcon v-if="contestStatus === 1" />
                <HourglassIcon v-else-if="contestStatus === 0" />
                <CheckCircleIcon v-else />
              </n-icon>
            </div>
            <div class="time-info">
              <div class="status-text">{{ statusText }}</div>
              <div class="time-countdown">{{ timeText }}</div>
            </div>
          </div>
        </div>

        <n-progress
          type="line"
          :percentage="progressPercentage"
          :color="statusStyle.descColor"
          :rail-color="statusStyle.header.backgroundColor"
          :show-indicator="false"
          :height="4"
          border-radius="0"
          class="contest-progress-bar"
        />
      </n-card>

      <div class="content-wrapper">
        <n-tabs 
          type="line" 
          :value="currentTab" 
          @update:value="handleTabChange"
          class="nav-tabs"
          size="large"
        >
          <n-tab name="ContestDescription" tab="比赛说明" />
          
          <n-tab 
            name="ContestProblems" 
            tab="题目列表" 
            :disabled="contestStatus === 0" 
          />
          <n-tab 
            name="ContestScoreboard" 
            tab="排行榜" 
            :disabled="contestStatus === 0" 
          />
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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { 
  TimeOutline as TimeIcon, 
  PersonOutline as PersonIcon,
  TimerOutline as TimerIcon,
  HourglassOutline as HourglassIcon,
  CheckmarkCircleOutline as CheckCircleIcon
} from '@vicons/ionicons5';
import { useContestDetail } from '@/composables/oj/useContestDetail';
import { formatDuration } from '@/composables/useTime';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const { 
  loading, detail, contestStatus, timeText, progressPercentage, fetchContestDetail 
} = useContestDetail();

const currentTab = computed(() => route.name as string);

const handleTabChange = (val: string) => {
  router.push({ name: val, params: { contestId: detail.value.id } });
};

const statusStyle = computed(() => {
  const configs = {
    0: { header: { backgroundColor: '#f0f9f4' }, descColor: '#18a058' },
    1: { header: { backgroundColor: '#fdf6ec' }, descColor: '#D5A000' },
    2: { header: { backgroundColor: '#fef0f0' }, descColor: '#f56c6c' }
  };
  return configs[contestStatus.value as 0 | 1 | 2];
});

const statusText = computed(() => {
  const map = { 0: 'Not Started', 1: 'Running', 2: 'Ended' };
  return map[contestStatus.value as 0 | 1 | 2];
});

const durationText = computed(() => {
  const start = new Date(detail.value.beginTime).getTime();
  const end = new Date(detail.value.endTime).getTime();
  return formatDuration(end - start);
});

//INFO: 后端记得实现比赛未开始时无法请求problem和rank
// 路由守卫，监听加载状态、比赛状态和当前路由的变化
watch(
  [() => loading.value, () => contestStatus.value, () => route.name],
  ([isLoading, status, currentRouteName]) => {
    // 只有当数据加载完成 (!isLoading) 且 比赛未开始 (status === 0) 时才执行检查
    if (!isLoading && status === 0) {
      const restrictedRoutes = ['ContestProblems', 'ContestScoreboard'];

      if (restrictedRoutes.includes(currentRouteName as string)) {
        router.replace({ 
          name: 'ContestDescription', 
          params: route.params 
        });
        
        message.warning('比赛尚未开始，无法查看题目和榜单');
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  const cid = route.params.contestId as string;
  fetchContestDetail(cid);
});
</script>

<style scoped lang="less">
.contest-detail-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  padding-bottom: 4px;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0 16px;

    .title-section {
      .contest-title {
        margin: 0 0 8px 0;
        font-size: 24px;
        color: #333;
        line-height: 1.2;
      }
      .meta-info {
        display: flex;
        gap: 20px;
        color: #666;
        font-size: 14px;
        span { display: flex; align-items: center; gap: 4px; }
      }
    }

    .status-section {
      display: flex;
      align-items: center;
      gap: 16px;
      text-align: right;
      
      .time-info {
        display: flex;
        flex-direction: column;
        .status-text { font-size: 14px; font-weight: bold; opacity: 0.8; }
        .time-countdown { font-size: 24px; font-weight: bold; font-family: 'Monaco', monospace; }
      }
    }
  }

  .contest-progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }
}

.content-wrapper {
  background: #fff;
  border-radius: 4px;
  min-height: 600px;
  padding: 0 20px 20px;

  .nav-tabs {
    margin-bottom: 20px;
    :deep(.n-tabs-tab) {
      padding: 16px 20px;
      font-size: 16px;
      font-weight: 500;
    }
    :deep(.n-tabs-tab--disabled) {
      cursor: not-allowed;
      color: #ccc;
    }
  }
}
</style>