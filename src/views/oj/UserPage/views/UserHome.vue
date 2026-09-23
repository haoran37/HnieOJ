<template>
  <div class="user-home">
    <n-card title="历史统计" :bordered="false" size="small" class="chart-card">
      <n-spin :show="loading">
        <n-alert v-if="error" type="error">{{ error }}</n-alert>
        <n-empty v-else-if="!summary?.daily.length" description="暂无提交记录" style="padding: 60px 0" />
        <VChart v-else :option="chartOption" style="height: 240px" autoresize />
      </n-spin>
    </n-card>

    <n-card title="已通过的题目" :bordered="false" size="small" class="chart-card">
      <template #header-extra>
        <span class="count-label">
          {{ accepted.length }} 题
        </span>
      </template>
      <div v-if="accepted.length > 0" class="problem-tags">
        <n-tag
          v-for="pid in accepted"
          :key="pid"
          type="success"
          size="small"
          class="p-tag"
          @click="$router.push(`/problem/${pid}`)"
        >
          {{ pid }}
        </n-tag>
      </div>
      <n-empty v-else description="暂无已通过题目" size="small" />
    </n-card>

    <n-card title="尝试过的题目" :bordered="false" size="small" class="chart-card">
      <template #header-extra>
        <span class="count-label">
          {{ attempted.length }} 题
        </span>
      </template>
      <div v-if="attempted.length > 0" class="problem-tags">
        <n-tag
          v-for="pid in attempted"
          :key="pid"
          type="warning"
          size="small"
          class="p-tag"
          @click="$router.push(`/problem/${pid}`)"
        >
          {{ pid }}
        </n-tag>
      </div>
      <n-empty v-else description="暂无尝试题目" size="small" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import VChart from '@/utils/echarts';
import { getUserSubmissionSummary, type UserSubmissionSummaryVo } from '@/utils/api';

const route = useRoute();
const loading = ref(false);
const error = ref('');
const summary = ref<UserSubmissionSummaryVo | null>(null);
const accepted = computed(() => summary.value?.problems.filter(p => p.accepted).map(p => p.problemCode) ?? []);
const attempted = computed(() => summary.value?.problems.filter(p => !p.accepted).map(p => p.problemCode) ?? []);
const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['提交', '通过'] },
  xAxis: { type: 'category', data: summary.value?.daily.map(d => d.day) ?? [] },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    { name: '提交', type: 'line', smooth: true, data: summary.value?.daily.map(d => d.submissions) ?? [] },
    { name: '通过', type: 'line', smooth: true, data: summary.value?.daily.map(d => d.accepted) ?? [] },
  ],
}));
let seq = 0;
watch(() => route.params.uid, async uid => {
  const current = ++seq;
  loading.value = true;
  error.value = '';
  try {
    const data = await getUserSubmissionSummary(String(uid));
    if (current === seq) summary.value = data;
  } catch (cause) {
    if (current === seq) { summary.value = null; error.value = cause instanceof Error ? cause.message : '获取做题记录失败'; }
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
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
