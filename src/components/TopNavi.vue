<template>
  <n-flex
    class="navi-bar"
    align="center"
    justify="center"
    :wrap="false"
  >
    <div class="content-limit-container">
      <n-text class="logo-container">
        <img :src="logo" alt="Hie Logo" />
        <span>HNIEOJ</span>
      </n-text>

      <div class="menu-wrapper">
        <n-menu
          mode="horizontal"
          :options="menuOptions"
          :value="activeKey"
        />
      </div>

      <div class="user-action-area">
        <n-space v-if="!userStore.isLogin">
          <n-button quaternary @click="router.push('/login')">登录</n-button>
          <n-button secondary type="primary" @click="router.push('/register')">注册</n-button>
        </n-space>

        <n-dropdown v-else :options="userOptions" @select="handleUserSelect" trigger="hover">
          <div class="user-info-trigger">
            <n-avatar
              round
              size="small"
              :src="userStore.userInfo?.avatar"
            />
            <span class="username">{{ userStore.userInfo?.username }}</span>
            <n-icon class="arrow-icon">
              <ChevronDownIcon /> 
            </n-icon>
          </div>
        </n-dropdown>
      </div>
    </div>
  </n-flex>
</template>

<script lang="ts" setup name="TopNavi">
import logo from '@/assets/hie.svg'
import { computed, h } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import type { MenuOption } from 'naive-ui';
import { ojRouters } from '@/router/routers';
import { ChevronDown as ChevronDownIcon } from '@vicons/ionicons5'

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const activeKey = computed(() => (route.meta?.activeMenu as string) || (route.name as string));

// 动态生成菜单项
const menuOptions = computed<MenuOption[]>(() => {
  const menuRoutes = ojRouters.children || [];

  return menuRoutes
    .filter(r => {
      if (r.meta?.hideInMenu) return false;
      return true
    })
    .map((r) => {
      const fullPath = r.path === '' ? '/' : `/${r.path}`;
      return {
        key: r.name as string,
        label: () =>
          h(
            RouterLink,
            { to: fullPath },
            { default: () => r.meta?.title as string }
          )
      };
    });
});

// 用户下拉菜单配置
const userOptions = [
  { label: '个人中心', key: 'profile' },
  { label: '消息通知', key: 'message' },
  { label: '后台管理', key: 'admin', show: userStore.isAdmin },
  { type: 'divider', key: 'd1' },
  { label: '退出登录', key: 'logout' }
];

function handleUserSelect(key: string) {
  switch(key) {
    case "profile": router.push(`/user/${userStore.userInfo?.id || 0}`); break; 
    case "admin": router.push(`/admin`); break;
    case "logout": 
      userStore.logout();
      router.push('/login'); 
      break;
  }
}
</script>

<style scoped lang="less">
@side-padding: 5%;
@logo-menu-gap: 56px;
@item-gap: 56px;
@font-size: 16px;
@text-color: #515A6E;
@active-color: #1a3968;
@line-thickness: 4px;

.navi-bar {
  background-color: rgba(216, 216, 216, 0.13);
  height: var(--header-height);
  width: 100%;
  position: relative;
  overflow: visible;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.15);
}

.content-limit-container {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 @side-padding;
  box-sizing: border-box;
}

.logo-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  span {
    padding: 0 10px;
    font-size: 18px;
    font-weight: bold;
    white-space: nowrap;
  }
  img {
    width: 35px;
    height: 35px;
  }
}

.menu-wrapper {
  margin-left: @logo-menu-gap;
  flex: 1;
  height: 100%;
  min-width: 0;
}

:deep(.n-menu.n-menu--horizontal) {
  height: 100%;
  align-items: center;

  .n-menu-item-content-bottom-line {
    display: none; 
  }

  .n-menu-item {
    margin-right: @item-gap;
    height: 100%;
    display: flex;
    align-items: center;
    
    &:last-child {
      margin-right: 0;
    }
  }

  .n-menu-item-content {
    padding: 0;
    font-size: @font-size;
    font-weight: bold;
    color: @text-color;
    height: 100%;
    display: flex;
    align-items: center;
    position: relative;

    &.n-menu-item-content--selected {
      color: @active-color;
      
      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: @line-thickness;
        background-color: @active-color;
        border-radius: 2px;
      }
    }
  }
}

.user-action-area {
  display: flex;
  align-items: center;
  margin-left: auto;
  cursor: pointer;
}

.user-info-trigger {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .username {
    margin-left: 10px;
    font-size: 14px;
    font-weight: bold;
    color: @text-color;
  }
}

@media (max-width: 1024px) {
  .menu-wrapper { margin-left: 24px; }
  :deep(.n-menu-item) { margin-right: 24px; }
}
</style>