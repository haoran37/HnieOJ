<template>
  <div class="dashboard-container">
    <n-alert v-if="error" type="error" class="mb-4" closable @close="error = null">
      <div class="error-row">
        <span>{{ error }}</span>
        <n-button size="small" @click="reload">重新加载</n-button>
      </div>
    </n-alert>

    <n-grid cols="1 s:2 m:3 l:6" responsive="screen" :x-gap="12" :y-gap="12">
      <n-grid-item v-for="item in statCards" :key="item.label">
        <n-card class="stat-card" :bordered="false" size="small">
          <n-statistic :label="item.label">
            <template #prefix>
              <n-icon :component="item.icon" :color="item.color" />
            </template>
            <span v-if="item.state === 'loading'" class="unavailable">加载中…</span>
            <span v-else-if="item.state === 'error'" class="load-error">加载失败</span>
            <span v-else-if="item.state === 'unavailable'" class="unavailable">暂未开放</span>
            <n-number-animation v-else :from="0" :to="item.value ?? 0" />
          </n-statistic>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-grid cols="1 m:2" responsive="screen" :x-gap="12" :y-gap="12" class="mt-4">
      <n-grid-item>
        <n-card title="增长趋势（近 7 天）" :bordered="false" size="small">
          <n-empty description="增长趋势暂未开放" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="提交结果分布" :bordered="false" size="small">
          <n-empty description="判题结果统计暂未开放" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-grid cols="1 m:2 l:3" responsive="screen" :x-gap="12" :y-gap="12" class="mt-4">
      <n-grid-item>
        <n-card title="热门题目" :bordered="false" size="small">
          <n-empty description="热门题目暂未开放" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="活跃题单" :bordered="false" size="small">
          <n-empty description="活跃题单暂未开放" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="冷门题目" :bordered="false" size="small">
          <n-empty description="冷门题目暂未开放" />
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  PeopleOutline,
  ListOutline,
  LayersOutline,
  CodeSlashOutline,
  TrophyOutline,
  BookOutline,
} from '@vicons/ionicons5'
import { NCard, NStatistic, NIcon, NNumberAnimation, NGrid, NGridItem, NEmpty, NAlert, NButton } from 'naive-ui'
import {
  useDashboard,
  dashboardMetricState,
  type DashboardMetric,
  type DashboardMetricState,
} from '@/composables/admin/useDashboard'

defineOptions({ name: 'AdminDashboardPage' })

const { error, totals, failed, loading, fetchData } = useDashboard()

const reload = () => {
  void fetchData()
}

interface StatCard {
  label: string
  value: number | null
  state: DashboardMetricState
  icon: object
  color: string
}

const statCards = computed<StatCard[]>(() => {
  const items: Array<{ key: DashboardMetric; label: string; icon: object; color: string }> = [
    { key: 'totalUsers', label: '总用户数', icon: PeopleOutline, color: '#2080f0' },
    { key: 'totalProblems', label: '题目总数', icon: ListOutline, color: '#f0a020' },
    { key: 'totalTrainings', label: '题单数量', icon: LayersOutline, color: '#d03050' },
    { key: 'totalContests', label: '比赛数量', icon: TrophyOutline, color: '#18a058' },
    { key: 'totalHomeworks', label: '作业数量', icon: BookOutline, color: '#8a2be2' },
    { key: 'totalSubmissions', label: '历史提交', icon: CodeSlashOutline, color: '#2080f0' },
  ]
  return items.map((item) => ({
    label: item.label,
    icon: item.icon,
    color: item.color,
    value: totals.value[item.key],
    state: dashboardMetricState(totals.value[item.key], failed.value[item.key], loading.value),
  }))
})

onMounted(() => {
  void fetchData()
})
</script>

<style scoped lang="less">
.dashboard-container {
  padding-bottom: 24px;
}

.mb-4 {
  margin-bottom: 12px;
}

.mt-4 {
  margin-top: 12px;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  }
}

.unavailable {
  font-size: 13px;
  color: #999;
}

.load-error {
  font-size: 13px;
  color: #d03050;
}

.error-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
