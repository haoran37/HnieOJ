<template>
  <n-layout has-sider class="admin-layout">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
      class="admin-sider"
    >
      <div class="logo">
        <n-icon size="30" color="#18a058"><HardwareChipOutline /></n-icon>
        <span v-show="!collapsed" class="title">OJ Admin</span>
      </div>
      
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuUpdate"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="admin-header">
        <div class="header-left">
          <span class="page-title">{{ currentRouteTitle }}</span>
        </div>
        <div class="header-right">
          <n-dropdown :options="userOptions" @select="handleUserSelect">
            <div class="user-trigger">
              <n-avatar round size="small" :src="userStore.userInfo.avatar" />
              <span class="username">{{ userStore.userInfo.username }}</span>
            </div>
          </n-dropdown>
        </div>
      </n-layout-header>

      <n-layout-content content-style="padding: 24px; background-color: #f5f7f9; min-height: calc(100vh - 64px);">
        <router-view v-slot="{ Component }">
          <transition name="fade-scale" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { NIcon } from 'naive-ui';
import { 
  SpeedometerOutline, 
  ListOutline, 
  PeopleOutline, 
  HardwareChipOutline,
  LogOutOutline
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores/userStore';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const collapsed = ref(false);

// 渲染图标工具函数
function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

// 菜单配置
const menuOptions = [
  {
    label: () => h(RouterLink, { to: '/admin/dashboard' }, { default: () => '仪表盘' }),
    key: 'AdminDashboard',
    icon: renderIcon(SpeedometerOutline)
  },
  {
    label: '题目管理',
    key: 'problem-manage',
    icon: renderIcon(ListOutline),
    children: [
      {
        label: () => h(RouterLink, { to: '/admin/problem/list' }, { default: () => '题目列表' }),
        key: 'AdminProblemList'
      },
      {
        label: '创建题目',
        key: 'AdminProblemCreate'
      }
    ]
  },
  {
    label: '用户管理',
    key: 'user-manage',
    icon: renderIcon(PeopleOutline),
    children: [
      { label: '用户列表', key: 'AdminUserList' }
    ]
  }
];

// 当前高亮的菜单项
const activeKey = computed(() => route.name as string);
const currentRouteTitle = computed(() => route.meta.title || '后台管理');

// 用户下拉菜单
const userOptions = [
  { label: '退出登录', key: 'logout', icon: renderIcon(LogOutOutline) }
];

const handleUserSelect = (key: string) => {
  if (key === 'logout') {
    userStore.logout();
    router.push('/login');
  }
};

const handleMenuUpdate = (key: string) => {
  // 可以在这里处理非 RouterLink 的跳转逻辑
};
</script>

<style scoped lang="less">
.admin-layout {
  height: 100vh;
}

.admin-sider {
  .logo {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-bottom: 1px solid #efeff5;
    overflow: hidden;
    
    .title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      white-space: nowrap;
    }
  }
}

.admin-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #fff;
  
  .page-title {
    font-size: 16px;
    font-weight: 500;
  }
  
  .user-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 4px;
    transition: background 0.3s;
    &:hover { background: #f0f0f0; }
    .username { font-weight: 500; }
  }
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.2s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>