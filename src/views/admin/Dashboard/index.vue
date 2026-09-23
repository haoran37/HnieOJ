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
          <VChart v-if="submissionStats" :option="trendOption" style="height: 260px" autoresize />
          <n-empty v-else description="趋势数据加载失败" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="提交结果分布" :bordered="false" size="small">
          <VChart v-if="submissionStats" :option="statusOption" style="height: 260px" autoresize />
          <n-empty v-else description="判题数据加载失败" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-grid cols="1 m:2 l:3" responsive="screen" :x-gap="12" :y-gap="12" class="mt-4">
      <n-grid-item>
        <n-card title="热门题目" :bordered="false" size="small">
          <n-empty v-if="!submissionStats?.hotProblems.length" description="暂无提交" />
          <div v-for="item in submissionStats?.hotProblems" :key="item.problemCode" class="list-row">
            <router-link :to="`/problem/${item.problemCode}`">{{ item.problemCode }}</router-link>
            <span>{{ item.submissions }} 次提交</span>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="收藏最多的题单" :bordered="false" size="small">
          <n-empty v-if="!favoriteTrainings.length" description="暂无题单收藏" />
          <div v-for="item in favoriteTrainings" :key="item.trainingId" class="list-row">
            <router-link :to="`/training/${item.trainingId}`">题单 #{{ item.trainingId }}</router-link>
            <span>{{ item.favorites }} 人收藏</span>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="低提交题目" :bordered="false" size="small">
          <n-empty v-if="!submissionStats?.lowActivityProblems.length" description="暂无提交" />
          <div v-for="item in submissionStats?.lowActivityProblems" :key="item.problemCode" class="list-row">
            <router-link :to="`/problem/${item.problemCode}`">{{ item.problemCode }}</router-link>
            <span>{{ item.submissions }} 次提交</span>
          </div>
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
import VChart from '@/utils/echarts'
import { SUBMISSION_STATUS_TEXT } from '@/types/submission'
import {
  useDashboard,
  dashboardMetricState,
  type DashboardMetric,
  type DashboardMetricState,
} from '@/composables/admin/useDashboard'

defineOptions({ name: 'AdminDashboardPage' })

const { error, totals, failed, loading, submissionStats, favoriteTrainings, fetchData } = useDashboard()
const trendOption = computed(() => {
  const counts = new Map(submissionStats.value?.daily.map(item => [item.day, item.submissions]) ?? [])
  const reportDate = submissionStats.value?.reportDate ?? submissionStats.value?.daily.at(-1)?.day
  const days = Array.from({ length: 7 }, (_, index) => {
    if (!reportDate) return ''
    const date = new Date(`${reportDate}T12:00:00`)
    date.setDate(date.getDate() - 6 + index)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
  return {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ name: '提交数', type: 'line', data: days.map(day => counts.get(day) ?? 0), smooth: true }],
  }
})
const statusOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['40%', '70%'], data: (submissionStats.value?.statuses ?? [])
    .map(item => ({ name: SUBMISSION_STATUS_TEXT[item.status] ?? `状态 ${item.status}`, value: item.submissions })) }],
}))

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

.list-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
</style>
