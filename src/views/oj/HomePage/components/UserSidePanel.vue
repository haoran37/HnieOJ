<template>
  <BoardCard title="用户">
    <template #icon>
      <n-icon size="20"><UserIcon /></n-icon>
    </template>

    <div class="user-panel-content">
      <div class="left-info">
        <div class="stat-line">
          <n-icon size="26" class="stat-icon blue-icon"><BarChartIcon /></n-icon>
          <span class="stat-label">评分:</span>
          <span class="stat-value">{{ userInfo.rating }}</span>
        </div>
        <div class="stat-line">
          <n-icon size="26" class="stat-icon red-icon"><RibbonIcon /></n-icon>
          <span class="stat-label">贡献:</span>
          <span class="stat-value">{{ userInfo.contribution }}</span>
        </div>

        <ul class="nav-list">
          <li v-for="item in menuItems" :key="item.key">
            <span class="dot">•</span>
            <n-button 
              text 
              type="primary" 
              class="nav-link" 
              @click="handleMenuClick(item.key)"
            >
              {{ item.label }}
            </n-button>
          </li>
        </ul>
      </div>

      <div class="right-avatar">
        <n-avatar
          :size="140"
          :style="{
            backgroundColor: '#2080f0',
            fontSize: '48px',
          }"
          src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
         />          
        <div class="display-username">{{ userInfo.username }}</div>
      </div>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 
  PersonOutline as UserIcon,
  BarChartOutline as BarChartIcon,
  RibbonOutline as RibbonIcon
} from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';

// TODO: 获取用户真实数据
// 模拟数据
const userInfo = ref({
  username: 'username',
  rating: 1280,
  contribution: 0
});

// 菜单配置username
const menuItems = [
  { label: '设置', key: 'settings' },
  { label: '团队', key: 'teams' },
  { label: '已提交', key: 'submissions' },
  { label: '收藏', key: 'favorites' },
  { label: '消息', key: 'messages' },
  { label: '比赛', key: 'contests' },
];

const emit = defineEmits(['menu-click']);

// TODO: 菜单点击处理
const handleMenuClick = (key: string) => {
  console.log(`点击了菜单: ${key}`);
  emit('menu-click', key);
};
</script>

<style scoped lang="less">
.user-panel-content {
  display: flex;
  justify-content: space-between;
  padding: 10px 5px;

  .left-info {
    flex: 1;

    .stat-line {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 16px;
      color: #333;

      .stat-icon {
        margin-right: 8px;
        color: #333;
        &.red-icon { color: #d03050; }
        &.blue-icon { color: #070096; }
      }
      .stat-label { font-weight: bold; font-size: 17px; }
      .stat-value { font-weight: bold; font-size: 17px;}
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 15px 0 0 5px;

      li {
        display: flex;
        align-items: center;
        margin-bottom: 4px;

        .dot {
          margin-right: 8px;
          color: #333;
          font-weight: bold;
        }

        .nav-link {
          font-size: 15px;
          font-weight: 500;
          font-weight: bold;
          color: #2080f0;
        }
      }
    }
  }

  .right-avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-left: 15px;

    .display-username {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
  }
}
</style>
