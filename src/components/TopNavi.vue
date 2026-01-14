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
        <n-dropdown :options="userOptions" @select="handleUserSelect" trigger="hover">
          <div class="user-info-trigger">
            <n-avatar
              round
              size="small"
              src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
            />
            <span class="username">username</span>
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
import { routes } from '@/router/routers'; // 修正引用路径，原文件可能是 @/router/routers
import { ChevronDown as ChevronDownIcon } from '@vicons/ionicons5'

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

// 修复高亮逻辑：优先读取 meta.activeMenu，解决详情页菜单不高亮的问题
const activeKey = computed(() => (route.meta?.activeMenu as string) || (route.name as string));

const ojRoute = routes.find(r => r.path === '/');

const menuOptions = computed<MenuOption[]>(() => {
  const menuRoutes = ojRoute?.children || [];

  return menuRoutes
    .filter(r => !r.meta?.hideInMenu)
    .map((r) => {
      // 确保路径拼接正确
      const fullPath = r.path === '' ? '/' : `/${r.path}`;
      return {
        key: r.name as string,
        label: () =>
          h(
            RouterLink,
            { 
              to: fullPath 
              // RouterLink 会自动处理 active class，但 naiv-ui 需要 key 匹配来控制下划线
            },
            { default: () => r.meta?.title as string }
          )
      };
    });
});

const userOptions = [
  { label: '个人中心', key: 'profile' },
  { label: '后台管理', key: 'admin' },
  { label: '消息通知', key: 'message' },
  { type: 'divider', key: 'd1' },
  { label: '退出登录', key: 'logout' }
];

function handleUserSelect(key: string) {
  switch(key) {
    case "profile": router.push(`/user/${userStore.userInfo?.id || 0}/home`); break; 
    case "admin": router.push(`/admin`); break;
    case "logout": 
      userStore.logout();
      router.push('/login'); 
      break;
  }
}
</script>

<style scoped lang="less">
@side-padding: 5%;          // 响应式边距：屏幕缩小时，左右至少保持 5% 的距离
@logo-menu-gap: 56px;       // Logo与菜单的间隔 
@item-gap: 56px;            // 每个菜单项之间的间距
@font-size: 16px;           // 字体大小
@text-color: #515A6E;       // 默认文字颜色
@active-color: #1a3968;     // 选中颜色
@line-thickness: 4px;       // 下划线粗细

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
  padding: 0 @side-padding; // 左右自动留空
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
  min-width: 0; // 防止Flex溢出
}

:deep(.n-menu.n-menu--horizontal) {
  height: 100%;
  align-items: center;

  // 禁用原生过渡效果
  .n-menu-item-content,
  .n-menu-item-content-header,
  .n-menu-item-content-header a {
    transition: none !important; 
  }

  .n-menu-item-content-bottom-line {
    display: none !important; 
  }

  .n-menu-item {
    margin-right: @item-gap !important;
    height: 100% !important;
    display: flex;
    align-items: center;
    
    &:last-child {
      margin-right: 0 !important;
    }
  }

  .n-menu-item-content {
    padding: 0 !important;
    font-size: @font-size !important;
    font-weight: bold !important;
    color: @text-color !important;
    height: 100%;
    display: flex;
    align-items: center;
    position: relative;
    overflow: visible;

    .n-menu-item-content-header {
      color: inherit !important;
      white-space: nowrap; // 文本不换行
      a { color: inherit !important; text-decoration: none; }
    }

    &.n-menu-item-content--selected {
      color: @active-color !important;
      
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

    &:hover {
      color: @active-color !important;
    }
  }
}

.user-action-area {
  display: flex;
  align-items: center;
  margin-left: auto; // 关键：将用户信息推向最右侧
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

// 当屏幕非常小时减小间距，防止挤压
@media (max-width: 1024px) {
  .menu-wrapper { margin-left: 24px; }
  :deep(.n-menu-item) { margin-right: 24px !important; }
}
</style>