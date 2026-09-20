<template>
  <div class="user-home">
    <n-card title="历史统计" :bordered="false" size="small" class="chart-card">
      <n-empty description="历史统计暂未开放" style="padding: 60px 0" />
    </n-card>

    <n-card title="已通过的题目" :bordered="false" size="small" class="chart-card">
      <template #header-extra>
        <span class="count-label">
          {{ userStore.acceptedProblems.size > 0 ? `${userStore.acceptedProblems.size} 题` : '暂未开放' }}
        </span>
      </template>
      <div v-if="userStore.acceptedProblems.size > 0" class="problem-tags">
        <n-tag
          v-for="pid in userStore.acceptedProblems"
          :key="pid"
          type="success"
          size="small"
          class="p-tag"
          @click="$router.push(`/problem/${pid}`)"
        >
          {{ pid }}
        </n-tag>
      </div>
      <n-empty v-else description="做题记录暂未开放" size="small" />
    </n-card>

    <n-card title="尝试过的题目" :bordered="false" size="small" class="chart-card">
      <template #header-extra>
        <span class="count-label">
          {{ userStore.wrongProblems.size > 0 ? `${userStore.wrongProblems.size} 题` : '暂未开放' }}
        </span>
      </template>
      <div v-if="userStore.wrongProblems.size > 0" class="problem-tags">
        <n-tag
          v-for="pid in userStore.wrongProblems"
          :key="pid"
          type="warning"
          size="small"
          class="p-tag"
          @click="$router.push(`/problem/${pid}`)"
        >
          {{ pid }}
        </n-tag>
      </div>
      <n-empty v-else description="做题记录暂未开放" size="small" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
</script>

<style scoped lang="less">
.user-home {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-card {
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.problem-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .p-tag {
    cursor: pointer;
    font-family: monospace;
    font-weight: bold;
    &:hover { opacity: 0.8; }
  }
}

.count-label {
  font-size: 12px;
  color: #999;
}
</style>
