import { computed, ref } from 'vue'
import { sleep } from '@/utils/mock'

type JudgeResult = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE' | 'SE'
type AlertType = 'warning' | 'error'

interface DistributionItem {
  value: number
  name: JudgeResult
}

interface AlertItem {
  type: AlertType
  title: string
  content: string
}

export const useDashboard = () => {
  const loading = ref(false)

  const coreMetrics = ref({
    totalUsers: 12053,
    dau: 842,
    totalProblems: 3500,
    totalTrainings: 128,
    totalSubmissions: 450921,
    todaySubmissions: 2301,
  })

  const healthMetrics = ref({
    judgeSuccessRate: 0.982,
    avgJudgeTime24h: 320,
    avgJudgeTime7d: 280,
    distribution: [
      { value: 1200, name: 'AC' },
      { value: 600, name: 'WA' },
      { value: 300, name: 'TLE' },
      { value: 100, name: 'MLE' },
      { value: 50, name: 'RE' },
      { value: 51, name: 'CE' },
      { value: 0, name: 'SE' },
    ] as DistributionItem[],
  })

  const contentMetrics = ref({
    hotProblems: [
      { id: '1001', title: 'A+B Problem', count: 120, trend: '+15%' },
      { id: '1024', title: '快速排序', count: 98, trend: '+8%' },
      { id: '2048', title: '动态规划入门', count: 85, trend: '+12%' },
      { id: '3033', title: '线段树模板', count: 72, trend: '+5%' },
      { id: '1005', title: '矩阵乘法', count: 60, trend: '-2%' },
    ],
    coldProblems: [
      { id: '9999', title: '极其复杂的计算几何', daysCreated: 365 },
      { id: '8888', title: '构造难题示例', daysCreated: 120 },
    ],
    activeTrainings: [
      { id: '1', title: 'C++ 基础语法训练', activeUsers: 305 },
      { id: '2', title: '图论进阶', activeUsers: 120 },
      { id: '3', title: '蓝桥杯突击', activeUsers: 98 },
    ],
  })

  const trendOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增用户', '提交次数'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { lineStyle: { color: '#999' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '新增用户',
        position: 'left',
        axisLine: { show: true, lineStyle: { color: '#2080f0' } },
        splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
      },
      {
        type: 'value',
        name: '提交次数',
        position: 'right',
        alignTicks: true,
        axisLine: { show: true, lineStyle: { color: '#18a058' } },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '新增用户',
        type: 'line',
        smooth: true,
        data: [120, 132, 101, 134, 90, 230, 210],
        itemStyle: { color: '#2080f0' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(32, 128, 240, 0.3)' },
              { offset: 1, color: 'rgba(32, 128, 240, 0.01)' },
            ],
          },
        },
        yAxisIndex: 0,
      },
      {
        name: '提交次数',
        type: 'line',
        smooth: true,
        data: [2200, 1820, 1910, 2340, 2900, 3300, 3100],
        itemStyle: { color: '#18a058' },
        yAxisIndex: 1,
      },
    ],
  }))

  const pieOption = computed(() => ({
    tooltip: { trigger: 'item' },
    legend: { top: 'middle', left: 'right', orient: 'vertical' },
    series: [
      {
        name: '提交结果',
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 5,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 18, fontWeight: 'bold' },
        },
        data: healthMetrics.value.distribution,
      },
    ],
  }))

  const alerts = computed<AlertItem[]>(() => {
    const list: AlertItem[] = []
    const waCount = healthMetrics.value.distribution.find((item) => item.name === 'WA')?.value ?? 0
    const totalToday = coreMetrics.value.todaySubmissions

    if (totalToday > 0 && waCount / totalToday > 0.2) {
      list.push({
        type: 'warning',
        title: '高错误率预警',
        content: `今日 WA 比例达到 ${((waCount / totalToday) * 100).toFixed(1)}%，请检查测试点配置。`,
      })
    }

    const seCount = healthMetrics.value.distribution.find((item) => item.name === 'SE')?.value ?? 0
    if (seCount > 0) {
      list.push({
        type: 'error',
        title: '判题机异常',
        content: `检测到 ${seCount} 次系统错误（SE），请尽快检查运行环境。`,
      })
    }

    if (healthMetrics.value.avgJudgeTime24h > 1000) {
      list.push({
        type: 'warning',
        title: '评测拥堵',
        content: '最近 24 小时平均判题时长超过 1 秒，可能存在队列积压。',
      })
    }

    return list
  })

  const fetchData = async () => {
    loading.value = true
    try {
      // TODO: Replace with real API request.
      await sleep(600)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    coreMetrics,
    healthMetrics,
    contentMetrics,
    trendOption,
    pieOption,
    alerts,
    fetchData,
  }
}
