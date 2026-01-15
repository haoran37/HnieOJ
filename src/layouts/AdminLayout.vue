<template>
  <n-layout has-sider class="admin-layout">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="appStore.collapsed"
      show-trigger
      @collapse="appStore.collapsed = true"
      @expand="appStore.collapsed = false"
      class="admin-sider"
    >
      <div class="logo-wrapper" :class="{ collapsed: appStore.collapsed }">
        <img src="@/assets/hie.svg" alt="Logo" class="logo-img" />
        <span class="logo-text">HnieOJ Admin</span>
      </div>

      <n-menu
        :collapsed="appStore.collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        :indent="24"
        :default-expanded-keys="defaultExpandedKeys"
      />
    </n-layout-sider>

    <n-layout class="main-layout">
      <n-layout-header bordered class="admin-header">
        <div class="header-left">
          <n-breadcrumb>
            <n-breadcrumb-item @click="$router.push('/')">HnieOJ</n-breadcrumb-item>
            <n-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.meta.title }}
            </n-breadcrumb-item>
          </n-breadcrumb>
        </div>

        <div class="header-right">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button circle quaternary @click="$router.push('/')">
                <template #icon><n-icon><HomeOutline /></n-icon></template>
              </n-button>
            </template>
            返回主站
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button circle quaternary @click="toggleFullScreen">
                <template #icon>
                  <n-icon>
                    <ExpandOutline v-if="!isFullScreen" />
                    <ContractOutline v-else />
                  </n-icon>
                </template>
              </n-button>
            </template>
            {{ isFullScreen ? '退出全屏' : '全屏模式' }}
          </n-tooltip>

          <n-divider vertical />
          
          <n-switch
            :value="appStore.darkMode"
            @update:value="appStore.toggleDarkMode"
            size="medium"
          >
            <template #checked-icon><n-icon><Moon /></n-icon></template>
            <template #unchecked-icon><n-icon><Sunny /></n-icon></template>
          </n-switch>
          <n-divider vertical />

          <n-dropdown :options="userOptions" @select="handleUserSelect">
            <div class="user-trigger">
              <n-avatar round size="small" :src="userStore.userInfo?.avatar || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'" />
              <span class="username">{{ userStore.userInfo?.username || 'Admin' }}</span>
            </div>
          </n-dropdown>
        </div>
      </n-layout-header>

      <n-layout-content content-style="padding: 24px;" class="admin-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h, isRef } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { NIcon } from 'naive-ui';
import { useUserStore } from '@/stores/userStore';
import { useAppStore } from '@/stores/app';
import { adminRouters } from '@/router/routers';
import { 
  LogOutOutline, 
  HomeOutline, 
  ExpandOutline, 
  ContractOutline, 
  Moon, 
  Sunny 
} from '@vicons/ionicons5';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const appStore = useAppStore();

// 全屏控制
const isFullScreen = ref(false);
const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullScreen.value = true;
  } else {
    document.exitFullscreen();
    isFullScreen.value = false;
  }
};

function renderIcon(icon: any) {
  const component = isRef(icon) ? icon.value : icon;
  return () => h(NIcon, null, { default: () => h(component) });
}

// 动态生成菜单
const menuOptions = computed(() => {
  const routes = adminRouters.children || [];

  const buildMenu = (routes: any[]) => {
    return routes
      .filter(r => !r.meta?.hideInMenu)
      .map(r => {
        const option: any = {
          label: r.children 
            ? r.meta?.title 
            : () => h(RouterLink, { to: { name: r.name } }, { default: () => r.meta?.title }),
          key: r.name, 
          icon: r.meta?.icon ? renderIcon(r.meta.icon) : undefined
        };
        if (r.children) {
          option.children = buildMenu(r.children);
        }
        return option;
      });
  };
  return buildMenu(routes);
});

const activeKey = computed(() => route.name as string);

const defaultExpandedKeys = computed(() => {
  return route.matched
    .map(r => r.name as string)
    .filter(name => name !== activeKey.value);
});

// 面包屑逻辑
const breadcrumbs = computed(() => {
  return route.matched.filter(item => item.meta?.title && item.path !== '/admin'); 
});

// 用户下拉菜单
const userOptions = [
  { label: '退出登录', key: 'logout', icon: renderIcon(LogOutOutline) }
];

const handleUserSelect = (key: string) => {
  if (key === 'logout') {
    // userStore.logout(); 
    router.push('/login');
  }
};
</script>

<style scoped lang="less">
.admin-layout {
  height: 100vh;
}

.logo-wrapper {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-start; 
  padding: 0 16px; 
  overflow: hidden;
  background-color: var(--n-color);
  border-bottom: 1px solid var(--n-border-color);
  box-sizing: border-box;

  .logo-img {
    width: 32px;
    height: 32px;
    flex-shrink: 0; 
  }

  .logo-text {
    margin-left: 12px;
    font-size: 18px;
    font-weight: bold;
    color: var(--n-text-color);
    white-space: nowrap;
    
    opacity: 1;
    max-width: 150px; 
    transition: 
      opacity 0.3s ease-in-out, 
      max-width 0.3s ease-in-out, 
      margin 0.3s ease-in-out;
  }

  &.collapsed {
    .logo-text {
      opacity: 0;
      max-width: 0;
      margin-left: 0;
    }
  }
}

.admin-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  
  .header-left {
    display: flex;
    align-items: center;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 4px;
    transition: background-color 0.3s;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
}

.admin-content {
  background-color: rgba(245, 247, 249, 0.5);
}

// 路由过渡动画
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>