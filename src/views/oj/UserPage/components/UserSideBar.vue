<template>
  <div class="user-sidebar">
    <n-card :bordered="false" size="small" class="side-card profile-card">
      <div class="profile-header">
        <n-avatar 
          round 
          :size="80" 
          :src="userStore.userInfo.avatar" 
          class="avatar"
        />
        <div class="names">
          <div class="username">{{ userStore.userInfo.username }}</div>
          <n-tag :type="roleConfig.type" size="small" :bordered="false" round>
            {{ roleConfig.text }}
          </n-tag>
        </div>
      </div>
      
      <n-divider style="margin: 12px 0" />
      
      <div class="info-list">
        <div class="info-item">
          <span class="label">姓名</span>
          <span class="value">{{ userStore.userInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">学号</span>
          <span class="value">{{ userStore.userInfo.id }}</span>
        </div>
        <div class="info-item">
          <span class="label">班级</span>
          <span class="value">{{ userStore.userInfo.class || '未填写' }}</span>
        </div>
        <div class="info-item">
          <span class="label">状态</span>
          <n-badge dot type="success" processing>
            <!-- TODO: 响应式 -->
            <span class="value" style="margin-left: 6px">在线</span>
          </n-badge>
        </div>
        <div class="info-item">
          <span class="label">上次登录</span>
          <span class="value small">2026-01-12 14:30</span>
        </div>
      </div>
    </n-card>

    <n-card title="个人成就" :bordered="false" size="small" class="side-card">
      <n-data-table
        :columns="achievementColumns"
        :data="achievementData"
        :bordered="false"
        size="small"
        :pagination="false"
        class="mini-table"
      />
    </n-card>

    <n-card title="提交统计" :bordered="false" size="small" class="side-card">
      <div class="stats-summary">
        <div class="stat-box">
          <div class="num">{{ solvedCount }}</div>
          <div class="label">解决</div>
        </div>
        <div class="stat-box">
          <div class="num">{{ submitCount }}</div>
          <div class="label">提交</div>
        </div>
        <div class="stat-box">
          <div class="num">{{ acRate }}%</div>
          <div class="label">AC率</div>
        </div>
        <div class="stat-box">
          <div class="num">{{ duplicateRate }}%</div>
          <div class="label">重复率</div>
        </div>
      </div>
      
      <div class="chart-container">
        <v-chart class="pie-chart" :option="pieOption" autoresize />
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VChart from '@/utils/echarts';
import { useUserStore, UserRole } from '@/stores/userStore';

const userStore = useUserStore();

// 身份标签配置
const roleConfig = computed(() => {
  const role = userStore.userInfo.role;
  switch (role) {
    case UserRole.ROOT:
    case UserRole.ADMIN:
      return { type: 'error', text: 'ADMIN' }; // 红色
    case UserRole.TEACHER:
      return { type: 'info', text: 'TEACHER' }; // 蓝色
    case UserRole.TA:
      return { type: 'warning', text: 'TA' }; // 橙色
    case UserRole.STUDENT:
    default:
      return { type: 'success', text: 'STUDENT' }; // 绿色
  }
});

//TODO: 从后端获取数据
// 成就数据
const achievementColumns = [
  { title: '时间', key: 'date', width: 90 },
  { title: '内容', key: 'content' }
];
const achievementData = [
  { key: 1, date: '2025/03/30', content: '20届HNCPC铜牌' },
  { key: 2, date: '2024/12/15', content: 'Codeforces 1600分' },
  { key: 3, date: '2024/03/30', content: '加入ACM实验室' }
];

// 提交数据
const solvedCount = 124;
const submitCount = 342;
const acRate = 36;
const duplicateRate = 12;

// 饼图配置
const pieOption = ref({
  tooltip: { trigger: 'item' },
  legend: { top: '0%', left: 'center', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 10 } },
  series: [
    {
      name: '提交分布',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '60%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: 124, name: 'AC', itemStyle: { color: '#18a058' } },
        { value: 50, name: 'WA', itemStyle: { color: '#d03050' } },
        { value: 30, name: 'TLE', itemStyle: { color: '#f0a020' } },
        { value: 18, name: 'MLE', itemStyle: { color: '#2080f0' } },
        { value: 10, name: 'RE', itemStyle: { color: '#8a2be2' } }
      ]
    }
  ]
});
</script>

<style scoped lang="less">
.user-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  
  .names {
    margin-top: 10px;
    text-align: center;
    .username { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 4px; }
  }
}

.info-list {
  .info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    .label { color: #888; }
    .value { color: #333; font-weight: 500; }
    .value.small { font-size: 12px; color: #666; }
  }
}

:deep(.mini-table .n-data-table-thead) {
  display: none;
}
:deep(.mini-table .n-data-table-td) {
  padding: 6px 8px;
  font-size: 12px;
  border-bottom: 1px solid #f9f9f9;
}

.stats-summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;
  
  .stat-box {
    text-align: center;
    .num { font-size: 15px; font-weight: bold; color: #333; }
    .label { font-size: 12px; color: #999; transform: scale(0.9); }
  }
}

.chart-container {
  height: 200px; 
  .pie-chart {
    height: 100%;
    width: 100%;
  }
}
</style>