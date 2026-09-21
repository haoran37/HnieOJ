import { ref } from 'vue'
import {
  getAdminContests,
  getAdminHomeworks,
  getAdminProblemList,
  getAdminTrainings,
  getSubmissions,
  getUsers,
} from '@/utils/api'

/** 仪表盘可用总量：全部来自对应列表接口的 total（非当前页长度） */
export interface DashboardTotals {
  totalUsers: number | null
  totalProblems: number | null
  totalTrainings: number | null
  totalContests: number | null
  totalHomeworks: number | null
  totalSubmissions: number | null
}

export type DashboardMetric = keyof DashboardTotals

/** 单项统计的展示状态：加载中 / 真实数值（含 0）/ 读取失败 / 后端确实无此能力 */
export type DashboardMetricState = 'loading' | 'value' | 'error' | 'unavailable'

const emptyTotals = (): DashboardTotals => ({
  totalUsers: null,
  totalProblems: null,
  totalTrainings: null,
  totalContests: null,
  totalHomeworks: null,
  totalSubmissions: null,
})

const emptyFailed = (): Record<DashboardMetric, boolean> => ({
  totalUsers: false,
  totalProblems: false,
  totalTrainings: false,
  totalContests: false,
  totalHomeworks: false,
  totalSubmissions: false,
})

/**
 * 状态映射（纯函数，便于回归）：
 * - loading 优先，刷新期间不展示旧值；
 * - 有真实数值（含 0）→ value；
 * - 空值且该接口失败 → error（不得显示“暂未开放”，也不得沿用旧成功值）；
 * - 空值且未失败 → unavailable（后端确实无该能力时保留的“暂未开放”）。
 */
export const dashboardMetricState = (
  value: number | null,
  failed: boolean,
  loading: boolean,
): DashboardMetricState => {
  if (loading) return 'loading'
  if (value !== null) return 'value'
  return failed ? 'error' : 'unavailable'
}

export const useDashboard = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totals = ref<DashboardTotals>(emptyTotals())
  const failed = ref<Record<DashboardMetric, boolean>>(emptyFailed())

  // 后端没有历史趋势/判题分布/热点统计等接口，页面必须明确“暂未开放”，不得用随机统计
  const trendAvailable = false
  const healthAvailable = false
  const contentAvailable = false

  // 已接入的 6 个真实 total 接口，任一失败都不能伪造成“暂未开放”
  const metricLoaders: Array<{
    key: DashboardMetric
    label: string
    load: () => PromiseLike<{ total?: number } | null>
  }> = [
    { key: 'totalUsers', label: '用户', load: () => getUsers({ page: 1, pageSize: 1 }) },
    { key: 'totalProblems', label: '题目', load: () => getAdminProblemList({ page: 1, pageSize: 1 }) },
    { key: 'totalTrainings', label: '题单', load: () => getAdminTrainings({ page: 1, pageSize: 1 }) },
    { key: 'totalContests', label: '比赛', load: () => getAdminContests({ page: 1, pageSize: 1 }) },
    { key: 'totalHomeworks', label: '作业', load: () => getAdminHomeworks({ page: 1, pageSize: 1 }) },
    { key: 'totalSubmissions', label: '提交', load: () => getSubmissions({ page: 1, pageSize: 1 }) },
  ]

  // 请求序号：重复触发（如快速重试）时，先发起的响应不得覆盖后发起的结果
  let fetchSeq = 0

  const fetchData = async () => {
    const current = ++fetchSeq
    loading.value = true
    error.value = null
    try {
      const results = await Promise.allSettled(metricLoaders.map((metric) => metric.load()))
      if (current !== fetchSeq) return
      const nextTotals = emptyTotals()
      const nextFailed = emptyFailed()
      const failedLabels: string[] = []
      results.forEach((result, index) => {
        const metric = metricLoaders[index]
        if (!metric) return
        if (result.status === 'fulfilled') {
          // 真实 total（0 也是有效值）
          nextTotals[metric.key] = result.value?.total ?? 0
        } else {
          nextFailed[metric.key] = true
          failedLabels.push(metric.label)
        }
      })
      // 整体覆盖：失败项保持 null，绝不沿用旧成功值冒充新状态
      totals.value = nextTotals
      failed.value = nextFailed
      if (failedLabels.length > 0) {
        error.value = `${failedLabels.join('、')}数据加载失败，请重试`
      }
    } finally {
      if (current === fetchSeq) loading.value = false
    }
  }

  return {
    loading,
    error,
    totals,
    failed,
    trendAvailable,
    healthAvailable,
    contentAvailable,
    fetchData,
  }
}
