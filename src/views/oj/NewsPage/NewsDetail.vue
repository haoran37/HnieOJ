<template>
  <div class="news-detail-container">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
        {{ error }}
        <n-button
          size="tiny"
          secondary
          type="error"
          style="margin-left: 8px"
          @click="fetchNewsDetail(String(route.params.id))"
        >
          重试
        </n-button>
      </n-alert>

      <div class="header-card">
        <div class="header-top">
          <n-button text class="back-btn" @click="$router.push('/news')">
            <template #icon><n-icon><ArrowBackIcon /></n-icon></template>
            返回列表
          </n-button>
        </div>

        <div class="title-wrapper">
          <h1 class="news-title">{{ detail.title }}</h1>
        </div>

        <div class="meta-info">
          <div class="meta-item">
            <n-icon><PersonIcon /></n-icon>
            <span>{{ detail.author }}</span>
          </div>
          <div class="meta-item">
            <n-icon><TimeIcon /></n-icon>
            <span>{{ detail.createTime }}</span>
          </div>
        </div>
      </div>

      <n-card :bordered="false" class="content-card">
        <div class="markdown-body-wrapper">
          <v-md-preview :text="detail.content || '> 暂无内容'"></v-md-preview>
        </div>
      </n-card>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowBackOutline as ArrowBackIcon,
  PersonOutline as PersonIcon,
  TimeOutline as TimeIcon
} from '@vicons/ionicons5';
import { useNewsDetail } from '@/composables/oj/useNewsDetail';

const route = useRoute();
const { loading, error, detail, fetchNewsDetail } = useNewsDetail();

// 同一路由记录换公告 id 时组件会被复用，必须按新参数重取
watch(
  () => route.params.id,
  (id) => {
    if (id) void fetchNewsDetail(String(id));
  },
);

onMounted(() => {
  const id = route.params.id as string;
  if (id) fetchNewsDetail(id);
});
</script>

<style scoped lang="less">
.news-detail-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  background: #fff;
  padding: 16px 32px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-left: 6px solid #2080f0;
  margin-bottom: 10px;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    height: 32px;

    .back-btn { color: #666; &:hover { color: #2080f0; } }
    
    .editing-tip {
      color: #2080f0;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .admin-actions { display: flex; gap: 12px; }
  }

  .title-wrapper {
    margin: 0 0 16px 0;
    min-height: 40px;
    
    .news-title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2225;
      margin: 0;
      line-height: 1.4;
    }

    .title-input { 
      font-weight: 700; 
      font-size: 20px; 
      :deep(.n-input__input-el) {
        font-family: inherit;
      }
    }
  }

  .meta-info {
    display: flex;
    gap: 24px;
    color: #888;
    font-size: 14px;
    border-top: 1px solid #f0f0f0;
    padding-top: 16px;
    .meta-item { display: flex; align-items: center; gap: 6px; .n-icon { font-size: 16px; } }
  }
}

.content-card {
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 600px;
  padding: 16px;

  .markdown-body-wrapper {
    :deep(.github-markdown-body) {
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.8;
      color: #2c3e50;
      h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
      p { margin-bottom: 16px; }
      blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding: 0 1em; background-color: #fafbfc; }
    }
  }
}
</style>