<template>
  <div class="status-detail-layout">
    <n-spin :show="loading">
      
      <div class="page-header" :style="{ borderLeftColor: statusColor }">
        <h1 class="title">#{{ detail?.id }} 记录详情</h1>
        <div class="status-tag" v-if="detail">
          <n-tag :type="statusType" size="large" :bordered="false">
            {{ detail.status }}
          </n-tag>
        </div>
      </div>

      <n-grid :x-gap="20" cols="1 l:4" responsive="screen">
        
        <n-grid-item span="3">
          <div class="main-content-wrapper">
            <n-tabs 
              type="line" 
              :value="currentTab" 
              @update:value="handleTabChange"
              class="custom-tabs"
            >
              <n-tab name="StatusCode" tab="源代码" />
              <n-tab name="StatusInfo" tab="测试点信息" v-if="userStore.isStaff" />
            </n-tabs>

            <div class="router-view-box">
              <router-view v-slot="{ Component }">
                <transition name="fade" mode="out-in">
                  <component :is="Component" :detail="detail" />
                </transition>
              </router-view>
            </div>
          </div>
        </n-grid-item>

        <n-grid-item span="1">
          <n-card :bordered="false" size="small" class="sidebar-card">
            
            <div class="sidebar-block">
              <div class="label">所属题目</div>
              <div class="value">
                <router-link :to="`/problem/${detail?.problemId}`" class="link">
                  {{ detail?.problemId }} {{ detail?.problemTitle }}
                </router-link>
              </div>
            </div>

            <n-divider style="margin: 12px 0" />

            <div class="sidebar-block">
              <div class="flex-row">
                <div>
                  <div class="label">评测状态</div>
                  <div class="value" :style="{ color: statusColor, fontWeight: 'bold' }">
                    {{ detail?.status }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="label">评测分数</div>
                  <div class="value score" :class="{ 'score-ac': detail?.score === 100 }">
                    {{ detail?.score }}
                  </div>
                </div>
              </div>
            </div>

            <n-divider style="margin: 12px 0" />

            <div class="info-list">
              <div class="info-item">
                <span class="label">递交者</span>
                <router-link :to="`/user/${detail?.author}`" class="link">
                  {{ detail?.author }}
                </router-link>
              </div>
              <div class="info-item">
                <span class="label">语言</span>
                <span class="value">{{ detail?.language }}</span>
              </div>
              <div class="info-item">
                <span class="label">代码长度</span>
                <span class="value">{{ detail?.codeLength }}</span>
              </div>
              <div class="info-item">
                <span class="label">提交时间</span>
                <span class="value time">{{ detail?.submitTime }}</span>
              </div>
              <div class="info-item">
                <span class="label">评测时间</span>
                <span class="value time">{{ detail?.judgeTime }}</span>
              </div>
              <div class="info-item">
                <span class="label">总耗时</span>
                <span class="value">{{ detail?.timeUsed }}</span>
              </div>
              <div class="info-item">
                <span class="label">峰值内存</span>
                <span class="value">{{ detail?.memoryUsed }}</span>
              </div>
            </div>

            <div class="action-area" v-if="userStore.isStaff">
              <n-button type="warning" dashed block @click="handleRejudge">
                <template #icon><n-icon><RefreshIcon /></n-icon></template>
                重 测
              </n-button>
            </div>

          </n-card>
        </n-grid-item>
      </n-grid>

    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { RefreshOutline as RefreshIcon } from '@vicons/ionicons5';
import { useStatusDetail } from '@/composables/oj/useStatusDetail';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const { loading, detail, fetchStatusDetail, rejudge } = useStatusDetail();

// === 路由与Tab联动 ===
const currentTab = computed(() => route.name as string);
const handleTabChange = (val: string) => {
  router.push({ name: val, params: { id: detail.value?.id } });
};

//TODO: 复用 statusColumns.ts 中的 statusConfig?
const statusType = computed(() => detail.value?.status === 'Accepted' ? 'success' : 'error');
const statusColor = computed(() => detail.value?.status === 'Accepted' ? '#18a058' : '#d03050');

const handleRejudge = () => {
if (detail.value?.id) {
    rejudge(detail.value.id, message);
  }
};

// === 初始化与重定向 ===
const init = async () => {
  const rid = route.params.id as string;
  await fetchStatusDetail(rid);

  // 如果当前在父路由 /status/:id，根据权限决定默认去向
  if (route.name === 'StatusDetail' || route.path === `/status/${rid}`) {
    if (userStore.isStaff) {
      router.replace({ name: 'StatusInfo', params: { id: rid } });
    } else {
      router.replace({ name: 'StatusCode', params: { id: rid } });
    }
  }
  if (route.name === 'StatusInfo' && !userStore.isStaff) {
    router.replace({ name: 'StatusCode', params: { id: rid } });
  }
};

onMounted(init);
</script>

<style scoped lang="less">
.status-detail-layout {
  max-width: 1400px;
  margin: 0 auto;
  min-height: 600px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 20px 24px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  margin-bottom: 10px;
  border-left: 6px solid;

  .title {
    margin: 0;
    font-size: 22px;
    color: #333;
    font-weight: 600;
  }
}

.main-content-wrapper {
  background: #fff;
  border-radius: 4px;
  min-height: 500px;
  padding: 0 24px 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  .custom-tabs {
    :deep(.n-tabs-tab) {
      padding: 16px 20px;
      font-size: 15px;
      font-weight: 500;
    }
  }
  
  .router-view-box {
    margin-top: 20px;
  }
}

.sidebar-card {
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border-radius: 4px;
  
  .sidebar-block {
    margin-bottom: 8px;
    .label { font-size: 13px; color: #909399; margin-bottom: 4px; }
    .value { font-size: 15px; color: #333; font-weight: 500; }
    .link { color: #2080f0; text-decoration: none; &:hover { text-decoration: underline; } }
    
    .score { font-size: 24px; color: #d03050; line-height: 1; }
    .score-ac { color: #18a058; }
    
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      .text-right { text-align: right; }
    }
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    .info-item {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      .label { color: #909399; }
      .value { color: #333; }
      .link { color: #2080f0; text-decoration: none; &:hover { text-decoration: underline; } }
    }
  }

  .action-area {
    margin-top: 24px;
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>