<template>
  <div class="user-home">
    
    <n-card title="练习活力" :bordered="false" size="small" class="chart-card">
      <div class="chart-box heatmap">
        <v-chart :option="heatmapOption" autoresize />
      </div>
    </n-card>

    <n-grid :x-gap="16" cols="1 m:2" responsive="screen">
      <n-grid-item>
        <n-card title="评分趋势" :bordered="false" size="small" class="chart-card">
          <template #header-extra>
            <span class="rank-info">当前排名：<strong style="color: #2080f0">124</strong></span>
          </template>
          <div class="chart-box">
            <v-chart :option="ratingOption" autoresize />
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="贡献趋势" :bordered="false" size="small" class="chart-card">
          <template #header-extra>
            <span class="rank-info">当前排名：<strong style="color: #18a058">5</strong></span>
          </template>
          <div class="chart-box">
            <v-chart :option="contributionOption" autoresize />
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-card title="已通过的题目" :bordered="false" size="small" class="chart-card">
      <template #header-extra>
        <span class="count-label">{{ userStore.acceptedProblems.size }} 题</span>
      </template>
      <div class="problem-tags">
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
    </n-card>

    <n-card title="尝试过的题目" :bordered="false" size="small" class="chart-card">
      <template #header-extra>
        <span class="count-label">{{ userStore.wrongProblems.size }} 题</span>
      </template>
      <div class="problem-tags">
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
    </n-card>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import VChart from '@/utils/echarts';
import * as echarts from 'echarts/core';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

//TODO: 从后端获取数据
const getVirtualData = (year: string) => {
  const date = +echarts.time.parse(year + '-01-01');
  const end = +echarts.time.parse(+year + 1 + '-01-01');
  const dayTime = 3600 * 24 * 1000;
  const data: [string, number][] = [];
  for (let time = date; time < end; time += dayTime) {
    data.push([
      echarts.time.format(time, '{yyyy}-{MM}-{dd}', false),
      Math.floor(Math.random() * 10)
    ]);
  }
  return data;
};

// 热力图
const heatmapOption = ref({
  tooltip: { 
    position: 'top', 
    // params.value[0]是日期，params.value[1]是提交数
    formatter: function (params: any) {
      return `${params.value[1]} AC on ${params.value[0]}`;
    }
  },
  visualMap: {
    min: 0,
    max: 10,
    type: 'piecewise',
    orient: 'horizontal',
    left: 'center',
    bottom: 0,
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { fontSize: 10, color: '#666' },
    pieces: [
      { min: 8, label: '多', color: '#216e39' },
      { min: 5, max: 7, color: '#30a14e' },
      { min: 3, max: 4, color: '#40c463' },
      { min: 1, max: 2, color: '#9be9a8' },
      { value: 0, label: '少', color: '#ebedf0' }
    ]
  },
  calendar: {
    top: 25,
    left: 30,
    right: 10,
    bottom: 40,
    cellSize: ['auto', 13],
    range: '2025',
    itemStyle: { borderWidth: 2, borderColor: '#fff' },
    splitLine: { show: false },
    yearLabel: { show: false },
    dayLabel: { nameMap: ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'], color: '#999', fontSize: 10 },
    monthLabel: { color: '#999', fontSize: 10 }
  },
  series: {
    type: 'heatmap',
    coordinateSystem: 'calendar',
    data: getVirtualData('2025')
  }
});

// 评分趋势图
const ratingOption = ref({
  tooltip: { trigger: 'axis' },
  grid: { top: '10%', left: '2%', right: '4%', bottom: '5%', containLabel: true },
  xAxis: { 
    type: 'category', 
    data: ['2025-01-01', '2025-01-08', '2025-01-15', '2025-01-22', '2025-01-29', '2025-02-05'],
    axisLabel: { color: '#888', fontSize: 10 },
    axisLine: { lineStyle: { color: '#eee' } }
  },
  yAxis: { 
    type: 'value', 
    min: 1400, 
    scale: true,
    splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
  },
  series: [{
    name: 'Rating',
    data: [1500, 1520, 1515, 1580, 1620, 1650],
    type: 'line',
    smooth: false,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { color: '#2080f0', width: 2 },
    itemStyle: { color: '#2080f0', borderWidth: 2, borderColor: '#fff' },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(32, 128, 240, 0.2)' },
        { offset: 1, color: 'rgba(32, 128, 240, 0.01)' }
      ])
    }
  }]
});

// 贡献趋势图
const contributionOption = ref({
  tooltip: { trigger: 'axis' },
  grid: { top: '10%', left: '2%', right: '4%', bottom: '5%', containLabel: true },
  xAxis: { 
    type: 'category', 
    data: ['2025-01-01', '2025-01-08', '2025-01-15', '2025-01-22', '2025-01-29', '2025-02-05'],
    axisLabel: { color: '#888', fontSize: 10 },
    axisLine: { lineStyle: { color: '#eee' } }
  },
  yAxis: { 
    type: 'value',
    splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
  },
  series: [{
    name: 'Contribution',
    data: [12, 5, 23, 8, 45, 12],
    type: 'line',
    smooth: true,
    showSymbol: false,
    lineStyle: { color: '#18a058', width: 2 },
    itemStyle: { color: '#18a058' }
  }]
});
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

.chart-box {
  height: 220px;
  width: 100%;
  
  &.heatmap {
    height: 180px; 
  }
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

// 排名信息样式
.rank-info {
  font-size: 12px;
  color: #666;
  strong { font-family: monospace; margin-left: 2px; font-size: 13px; }
}
</style>