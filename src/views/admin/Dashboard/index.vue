<template>
  <div class="dashboard-container">
    <transition-group name="list" tag="div" class="alert-section">
      <n-alert
        v-for="(alert, index) in alerts"
        :key="index"
        :title="alert.title"
        :type="alert.type"
        closable
        class="mb-4"
      >
        {{ alert.content }}
      </n-alert>
    </transition-group>

    <n-grid cols="1 s:2 m:3 l:6" responsive="screen" :x-gap="12" :y-gap="12">
      <n-grid-item v-for="(item, index) in statCards" :key="index">
        <n-card class="stat-card" :bordered="false" size="small">
          <n-statistic :label="item.label">
            <template #prefix>
              <n-icon :component="item.icon" :color="item.color" />
            </template>
            <n-number-animation :from="0" :to="item.value" />
            <template v-if="item.suffix" #suffix>
              <span class="stat-suffix">/ {{ item.suffix }}</span>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-grid cols="1 l:3" responsive="screen" :x-gap="12" :y-gap="12" class="mt-4">
      <n-grid-item span="2">
        <n-card title="增长趋势（近 7 天）" :bordered="false" class="h-full" size="small">
          <template #header-extra>
            <n-radio-group v-model:value="trendRange" size="small">
              <n-radio-button value="7d">7 天</n-radio-button>
              <n-radio-button value="30d">30 天</n-radio-button>
            </n-radio-group>
          </template>
          <BaseChart :option="trendOption" height="300px" />
        </n-card>
      </n-grid-item>

      <n-grid-item span="1">
        <n-card title="提交结果分布" :bordered="false" class="h-full" size="small">
          <div class="health-indicator">
            <div class="health-item">
              <span class="label">判题成功率</span>
              <n-progress
                type="line"
                :percentage="healthMetrics.judgeSuccessRate * 100"
                :color="healthMetrics.judgeSuccessRate > 0.9 ? '#18a058' : '#d03050'"
                :show-indicator="true"
                processing
                :height="8"
              />
            </div>
            <div class="health-item">
              <span class="label">平均耗时</span>
              <span class="value">{{ healthMetrics.avgJudgeTime24h }} ms</span>
            </div>
          </div>
          <n-divider style="margin: 10px 0" />
          <BaseChart :option="pieOption" height="200px" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-grid cols="1 m:2 l:3" responsive="screen" :x-gap="12" :y-gap="12" class="mt-4">
      <n-grid-item>
        <n-card :bordered="false" size="small">
          <template #header>
            <n-space align="center" size="small">
              <n-icon color="#f0a020"><FlameOutline /></n-icon>
              <span>热门题目 TOP 5</span>
            </n-space>
          </template>
          <n-list hoverable class="dense-list">
            <n-list-item v-for="(problem, index) in contentMetrics.hotProblems" :key="problem.id">
              <div class="flex-row">
                <n-tag :type="index < 3 ? 'error' : 'default'" size="tiny" class="mr-2 rank-tag">{{ index + 1 }}</n-tag>
                <span class="text-ellipsis flex-1 text-sm">{{ problem.title }}</span>
                <span class="text-gray text-xs">{{ problem.count }} 次</span>
                <span class="text-green ml-2 text-xs font-mono">{{ problem.trend }}</span>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card :bordered="false" size="small">
          <template #header>
            <n-space align="center" size="small">
              <n-icon color="#2080f0"><LibraryOutline /></n-icon>
              <span>活跃题单</span>
            </n-space>
          </template>
          <n-list hoverable class="dense-list">
            <n-list-item v-for="list in contentMetrics.activeTrainings" :key="list.id">
              <div class="flex-row">
                <span class="text-ellipsis flex-1 text-sm">{{ list.title }}</span>
                <n-tag type="success" size="tiny" round>{{ list.activeUsers }} 人</n-tag>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card :bordered="false" size="small">
          <template #header>
            <n-space align="center" size="small">
              <n-icon color="#999"><CubeOutline /></n-icon>
              <span>冷门题目</span>
            </n-space>
          </template>
          <n-list hoverable class="dense-list">
            <n-list-item v-for="problem in contentMetrics.coldProblems" :key="problem.id">
              <div class="flex-row">
                <span class="text-ellipsis flex-1 text-gray text-sm">{{ problem.title }}</span>
                <span class="text-xs text-warning">创建 {{ problem.daysCreated }} 天</span>
              </div>
            </n-list-item>
          </n-list>
          <template #footer>
            <n-button dashed block size="small" class="mt-2">一键处理</n-button>
          </template>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  PeopleOutline,
  TodayOutline,
  ListOutline,
  LayersOutline,
  CodeSlashOutline,
  TrendingUpOutline,
  FlameOutline,
  LibraryOutline,
  CubeOutline,
} from '@vicons/ionicons5'
import BaseChart from '@/components/BaseChart.vue'
import { useDashboard } from '@/composables/admin/useDashboard'

defineOptions({ name: 'AdminDashboardPage' })

const { coreMetrics, healthMetrics, contentMetrics, trendOption, pieOption, alerts, fetchData } = useDashboard()
const trendRange = ref('7d')

interface StatCard {
  label: string
  value: number
  icon: object
  color: string
  suffix?: string
}

const statCards = computed<StatCard[]>(() => [
  { label: '总用户数', value: coreMetrics.value.totalUsers, icon: PeopleOutline, color: '#2080f0' },
  { label: '今日活跃', value: coreMetrics.value.dau, icon: TrendingUpOutline, color: '#18a058' },
  { label: '题目总数', value: coreMetrics.value.totalProblems, icon: ListOutline, color: '#f0a020' },
  { label: '题单数量', value: coreMetrics.value.totalTrainings, icon: LayersOutline, color: '#d03050' },
  { label: '历史提交', value: coreMetrics.value.totalSubmissions, icon: CodeSlashOutline, color: '#8a2be2' },
  { label: '今日提交', value: coreMetrics.value.todaySubmissions, icon: TodayOutline, color: '#2080f0', suffix: '次' },
])

onMounted(() => {
  void fetchData()
})
</script>

<style scoped lang="less">
.dashboard-container {
  padding-bottom: 24px;
}

.alert-section {
  margin-bottom: 12px;
}

.mb-4 {
  margin-bottom: 12px;
}

.mt-4 {
  margin-top: 12px;
}

.mt-2 {
  margin-top: 8px;
}

.mr-2 {
  margin-right: 8px;
}

.ml-2 {
  margin-left: 8px;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  }
}

.stat-suffix {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
}

.h-full {
  height: 100%;
}

.health-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 20px;

  .health-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 12px;
    color: #666;
  }

  .value {
    font-size: 16px;
    font-weight: 700;
    color: #333;
  }
}

.dense-list {
  background: transparent;

  :deep(.n-list-item) {
    padding: 8px 12px;
  }
}

.flex-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-gray {
  color: #999;
}

.text-green {
  color: #18a058;
}

.text-warning {
  color: #f0a020;
}

.flex-1 {
  flex: 1;
}

.text-xs {
  font-size: 12px;
}

.text-sm {
  font-size: 13px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.rank-tag {
  width: 16px;
  height: 16px;
  justify-content: center;
}
</style>
