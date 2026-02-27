<template>
  <div class="status-info-view">
    
    <div class="section-header">
      <span class="title">测试点信息</span>
      <span class="count" v-if="detail?.testPoints">共 {{ detail.testPoints.length }} 个测试点</span>
    </div>
    
    <div class="test-points-list">
      <div 
        v-for="point in detail?.testPoints" 
        :key="point.id" 
        class="point-item"
        :class="getStatusClass(point.status)"
      >
        <div class="left-part">
          <div class="status-icon">
            <n-icon size="18"><component :is="getIcon(point.status)" /></n-icon>
          </div>
          <div class="point-info">
            <span class="point-idx">#{{ point.id }}</span>
            <span class="point-text">{{ point.status }}</span>
          </div>
        </div>
        
        <div class="right-part">
          <div class="metric-tag">
            <n-icon class="m-icon"><TimeIcon /></n-icon> {{ point.time }}
          </div>
          <div class="metric-tag">
            <n-icon class="m-icon"><HardwareChipIcon /></n-icon> {{ point.memory }}
          </div>
          <div class="score-tag">
            {{ point.score }} pts
          </div>
        </div>
      </div>
    </div>

    <div class="download-area" v-if="userStore.isTeacher">
      <div class="header-bar">
        <span class="title">测试数据下载</span>

        <div class="dl-actions">
          <n-button 
            size="small"
            type="primary"
            secondary class="batch-dl"
            @click="downloadAllData"
          >
            <template #icon><n-icon><DownloadIcon /></n-icon></template>
            打包下载全部数据
          </n-button>
        </div>
      </div>
      

      <n-grid :x-gap="12" :y-gap="12" cols="2 s:3 m:4 l:5" responsive="screen" class="dl-grid">
        <n-grid-item v-for="point in detail?.testPoints" :key="point.id">
          <n-button 
            block 
            size="small" 
            dashed 
            class="dl-item-btn"
            @click="downloadData(point.id)"
          >
            <template #icon><n-icon><DocumentIcon /></n-icon></template>
            Data #{{ point.id }}
          </n-button>
        </n-grid-item>
      </n-grid>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { 
  CheckmarkCircle, CloseCircle, AlertCircle, 
  TimeOutline as TimeIcon, 
  HardwareChipOutline as HardwareChipIcon,
  CloudDownloadOutline as DownloadIcon,
  DocumentTextOutline as DocumentIcon
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores/userStore';
import type { StatusDetail } from '@/composables/oj/useStatusDetail';

defineProps<{ detail: StatusDetail }>();
const userStore = useUserStore();
const message = useMessage();

//TODO: 复用 statusColumns.ts 中的 statusConfig?
const getStatusClass = (status: string) => {
  if (status === 'Accepted') return 'is-ac';
  if (status === 'Wrong Answer') return 'is-wa';
  if (status.includes('Time')) return 'is-tle';
  if (status.includes('Memory')) return 'is-mle';
  return 'is-err';
};

const getIcon = (status: string) => {
  if (status === 'Accepted') return CheckmarkCircle;
  if (status === 'Wrong Answer') return CloseCircle;
  return AlertCircle;
};

const downloadData = (pid: number) => {
  message.success(`开始下载测试点 #${pid} 数据`);
  //TODO: 实现逻辑
};

const downloadAllData = () => {
  message.success(`开始打包下载全部测试点数据`);
  //TODO: 实现逻辑
};
</script>

<style scoped lang="less">
.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  .title { font-size: 16px; font-weight: bold; color: #333; }
  .count { font-size: 12px; color: #999; }
}

.test-points-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-radius: 4px;
  background: #fff;
  border: 1px solid #eee;
  border-left-width: 4px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  .left-part {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .status-icon { display: flex; align-items: center; }
    
    .point-info {
      display: flex;
      align-items: baseline;
      gap: 8px;
      .point-idx { font-weight: bold; color: #666; font-family: monospace; width: 32px; }
      .point-text { font-weight: bold; font-size: 14px; }
    }
  }

  .right-part {
    display: flex;
    align-items: center;
    gap: 24px;
    
    .metric-tag {
      font-size: 13px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 4px;
      width: 80px;
      .m-icon { color: #999; }
    }
    
    .score-tag {
      font-weight: bold;
      color: #333;
      width: 50px;
      text-align: right;
    }
  }

  // 状态颜色定义
  &.is-ac {
    background-color: #f6ffed; border-color: #b7eb8f; border-left-color: #52c41a;
    .status-icon, .point-text { color: #52c41a; }
  }
  &.is-wa {
    background-color: #fff1f0; border-color: #ffa39e; border-left-color: #f5222d;
    .status-icon, .point-text { color: #f5222d; }
  }
  &.is-tle, &.is-mle {
    background-color: #fffbe6; border-color: #ffe58f; border-left-color: #faad14;
    .status-icon, .point-text { color: #faad14; }
  }
  &.is-err {
    background-color: #f5f5f5; border-color: #d9d9d9; border-left-color: #595959;
    .status-icon, .point-text { color: #595959; }
  }
}

.download-area {
  margin-top: 32px;
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
  border: 1px dashed #e0e0e0;

  .header-bar {
    display: flex;
    justify-content: space-between;
  }

  .title { font-size: 16px; font-weight: bold; color: #333; }

  .dl-actions { margin-bottom: 12px; }
  
  .dl-item-btn {
    font-size: 12px;
    color: #555;
    &:hover { color: #2080f0; border-color: #2080f0; }
  }
}
</style>
