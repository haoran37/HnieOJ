<template>
  <div class="training-info-view">
    <n-grid :x-gap="24" cols="1 l:4" responsive="screen">
      <n-grid-item span="3">
        <n-card :bordered="false" class="intro-card">
          <v-md-preview :text="detail.description || '> 暂无简介'"></v-md-preview>
        </n-card>
      </n-grid-item>

      <n-grid-item span="1">
        <n-card title="题单信息" size="small" :bordered="false" class="info-sidebar">
          <n-space vertical size="large">
            
            <div class="info-row">
              <span class="label">题单编号</span>
              <span class="value mono">{{ detail.id }}</span>
            </div>

            <div class="info-row">
              <span class="label">创建者</span>
              <span class="value link">{{ detail.creator }}</span>
            </div>

            <div class="info-row">
              <span class="label">题单类型</span>
              <n-tag :type="detail.type === 'OFFICIAL' ? 'primary' : 'info'" size="small">
                {{ detail.type === 'OFFICIAL' ? '官方精选' : '用户分享' }}
              </n-tag>
            </div>

            <div class="info-row rating-row">
              <span class="label">题单评分</span>
              <n-rate readonly :value="detail.rating" allow-half size="small" />
            </div>

            <div class="info-row vertical">
              <div class="progress-label">
                <span class="label">我的进度</span>
                <span class="value">{{ detail.userProgress }}%</span>
              </div>
              <n-progress 
                type="line" 
                :percentage="detail.userProgress" 
                :color="detail.userProgress === 100 ? '#18a058' : '#2080f0'"
                :show-indicator="false"
                height="8"
                border-radius="4"
              />
            </div>

          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import type { TrainingDetail } from '@/composables/useTrainingDetail';

// 由父组件传参
defineProps<{
  detail: TrainingDetail
}>();
</script>

<style scoped lang="less">
.intro-card {
  min-height: 400px;
  //去除 markdown 组件默认的宽内边距
  :deep(.github-markdown-body) {
    padding: 0 !important; 
  }
}

.info-sidebar {
  background: #f9f9f9; 
  border-radius: 8px;

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    
    &.vertical {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      width: 100%;
    }
    &.rating-row {
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      
      .label {
        min-width: 70px;
        flex-shrink: 0;
        color: #666;
      }
    }
    .label { color: #666; }
    .value { color: #333; font-weight: 500; }
    .mono { font-family: monospace; }
    .link { color: #2080f0; cursor: pointer; &:hover { text-decoration: underline; }}
    
    .progress-label {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
  }
}
</style>