<template>
  <div class="homework-detail-container">
    <n-spin :show="loading">
      
      <div class="course-header-card">
        <div class="header-main-content">
          <div class="card-left">
            <div class="course-tag">{{ detail.courseName }}</div>
            <h1 class="homework-title">
              <n-icon class="book-icon"><BookIcon /></n-icon>
              {{ detail.title }}
            </h1>
            <div class="meta-info">
              <span class="meta-item">
                <span class="label">开始时间：</span>
                <span class="value">{{ formatTime(detail.beginTime) }}</span>
              </span>
              <n-divider vertical />
              <span class="meta-item">
                <span class="label">截止时间：</span>
                <span class="value deadline">{{ formatTime(detail.deadline) }}</span>
              </span>
              <n-divider vertical />
              <span class="meta-item">
                <n-tag :type="statusUI.type" size="small" :bordered="false">
                  {{ statusUI.text }}
                </n-tag>
              </span>
            </div>
          </div>
          
          <div class="card-right-stats" v-if="userStore.isTeacher">
            <div class="stat-box">
              <div class="stat-num">{{ detail.stats.submittedCount }}<span class="slash">/</span>{{ detail.stats.studentCount }}</div>
              <div class="stat-label">提交人数</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-box">
              <div class="stat-num highlight">{{ detail.stats.averageScore }}</div>
              <div class="stat-label">平均分</div>
            </div>
          </div>
        </div>

        <n-progress
          type="line"
          :percentage="progressPercentage"
          :show-indicator="false"
          :height="4"
          border-radius="0"
          :color="progressColor"
          class="homework-progress-bar"
        />
      </div>

      <div class="nav-container">
        <n-tabs 
          type="line" 
          :value="currentTab"
          @update:value="handleTabChange"
          class="course-tabs"
          size="large"
        >
          <n-tab name="HomeworkOverview" tab="作业要求" />
          <n-tab name="HomeworkProblems" tab="题目列表" />
          <n-tab name="HomeworkRankings" tab="成绩单 & 排名" />
        </n-tabs>
      </div>

      <div class="content-body">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :detail="detail" />
          </transition>
        </router-view>
      </div>

    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NTag, NProgress } from 'naive-ui';
import { BookOutline as BookIcon } from '@vicons/ionicons5';
import { useHomeworkDetail } from '@/composables/oj/useHomeworkDetail';
import { formatTime, useStatusTime } from '@/composables/useTime';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const { loading, detail, fetchHomeworkDetail } = useHomeworkDetail();

const { contestStatus, now } = useStatusTime(
  () => detail.value.beginTime,
  () => detail.value.deadline
);

const currentTab = computed(() => route.name as string);

const handleTabChange = (val: string) => {
  router.push({ name: val, params: { homeworkId: detail.value.id } });
};

type TagType = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';

const statusUI = computed<{ text: string; type: TagType }>(() => {
  switch (contestStatus.value) {
    case 0: 
      return { text: '未开始', type: 'info' };
    case 1: 
      return { text: '进行中', type: 'success' };
    case 2: 
      return { text: '已截止', type: 'default' };
    default: 
      return { text: '未知', type: 'default' };
  }
});

// 计算时间进度
const progressPercentage = computed(() => {
  if (!detail.value.beginTime || !detail.value.deadline) return 0;
  
  const currentTime = now.value.getTime();
  const start = new Date(detail.value.beginTime).getTime();
  const end = new Date(detail.value.deadline).getTime();
  const total = end - start;
  
  if (total <= 0) return 100;
  
  const elapsed = currentTime - start;
  
  if (elapsed < 0) return 0;
  if (elapsed > total) return 100;
  return (elapsed / total) * 100;
});

const progressColor = computed(() => {
  if (contestStatus.value === 2) return '#f56c6c';
  if (progressPercentage.value > 80) return '#f0a020';
  return '#18a058';
});

onMounted(() => {
  const hid = route.params.homeworkId as string;
  fetchHomeworkDetail(hid);
});
</script>

<style scoped lang="less">
.homework-detail-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.course-header-card {
  background: #fff;
  border-radius: 4px;
  border-left: 6px solid #2080f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  position: relative;
  overflow: hidden; 

  .header-main-content {
    padding: 24px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .homework-progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    transition: width 1s linear;
  }

  .card-left {
    .course-tag {
      font-size: 13px;
      color: #666;
      background: #f0f2f5;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .homework-title {
      margin: 0 0 12px 0;
      font-size: 24px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 10px;
      .book-icon { color: #2080f0; }
    }
    .meta-info {
      font-size: 14px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 12px;
      .label { color: #999; }
      .deadline { color: #d03050; }
    }
  }

  .card-right-stats {
    display: flex;
    gap: 24px;
    align-items: center;
    background: #f9f9fa;
    padding: 12px 24px;
    border-radius: 8px;
    .stat-box {
      text-align: center;
      .stat-num {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        .slash { font-size: 14px; color: #bbb; margin: 0 2px; }
        &.highlight { color: #2080f0; }
      }
      .stat-label { font-size: 12px; color: #999; }
    }
    .stat-divider { width: 1px; height: 30px; background: #e0e0e0; }
  }
}

.nav-container {
  background: #fff;
  padding: 0 20px;
  border-radius: 4px;
  border-bottom: 1px solid #eee;

  :deep(.n-tabs-tab) {
    padding: 16px 20px;
    font-size: 16px;
    font-weight: 500;
  }
}

.content-body {
  background: #fff;
  min-height: 500px;
  border-radius: 4px;
  padding: 24px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>