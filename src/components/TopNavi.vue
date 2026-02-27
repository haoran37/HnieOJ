<template>
  <n-flex class="navi-bar" align="center" justify="center" :wrap="false">
    <div class="content-limit-container">
      <RouterLink class="logo-container" to="/">
        <img :src="logo" alt="HNIEOJ Logo" width="35" height="35" />
        <span>HNIEOJ</span>
      </RouterLink>

      <div class="menu-wrapper">
        <n-menu mode="horizontal" :options="menuOptions" :value="activeKey" />
      </div>

      <div class="user-action-area">
        <n-space v-if="!userStore.isLogin">
          <n-button quaternary @click="router.push('/login')">登录</n-button>
          <n-button secondary type="primary" @click="router.push('/register')">注册</n-button>
        </n-space>

        <n-dropdown v-else :options="userOptions" trigger="hover" @select="handleUserSelect">
          <button class="user-info-trigger" type="button" aria-label="打开用户菜单">
            <n-avatar round size="small" :src="userStore.userInfo?.avatar" />
            <span class="username">{{ userStore.userInfo?.username }}</span>
            <n-icon class="arrow-icon"><ChevronDownIcon /></n-icon>
          </button>
        </n-dropdown>
      </div>
    </div>
  </n-flex>
</template>

<script lang="ts" setup>
import logo from '@/assets/hie.svg'
import { computed, h } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import type { DropdownOption, MenuOption } from 'naive-ui'
import { ojRouters } from '@/router/routers'
import { ChevronDown as ChevronDownIcon } from '@vicons/ionicons5'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const activeKey = computed(() => (route.meta?.activeMenu as string) || (route.name as string))

const menuOptions = computed<MenuOption[]>(() => {
  const menuRoutes = ojRouters.children ?? []

  return menuRoutes
    .filter((item) => !item.meta?.hideInMenu)
    .map((item) => {
      const fullPath = item.path === '' ? '/' : `/${item.path}`
      return {
        key: item.name as string,
        label: () => h(RouterLink, { to: fullPath }, { default: () => String(item.meta?.title ?? item.name) }),
      }
    })
})

const userOptions = computed<DropdownOption[]>(() => {
  const base: DropdownOption[] = [
    { label: '个人中心', key: 'profile' },
    { label: '消息通知', key: 'message' },
    { type: 'divider', key: 'divider' },
    { label: '退出登录', key: 'logout' },
  ]

  if (userStore.isAdmin) {
    base.splice(2, 0, { label: '后台管理', key: 'admin' })
  }

  return base
})

function handleUserSelect(key: string | number) {
  switch (key) {
    case 'profile':
      router.push(`/user/${userStore.userInfo?.id || 0}`)
      break
    case 'message':
      router.push(`/user/${userStore.userInfo?.id || 0}/message`)
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      userStore.logout()
      router.push('/login')
      break
    default:
      break
  }
}
</script>

<style scoped lang="less">
@side-padding: 5%;
@logo-menu-gap: 40px;
@item-gap: 36px;
@font-size: 15px;
@text-color: #515a6e;
@active-color: #1a3968;
@line-thickness: 3px;

.navi-bar {
  background-color: rgba(255, 255, 255, 0.95);
  height: var(--header-height);
  width: 100%;
  position: relative;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #eef2f7;
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
  cursor: pointer;
  color: #1f2d3d;
  text-decoration: none;

  span {
    padding: 0 10px;
    font-size: 18px;
    font-weight: 700;
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
  }

  .n-menu-item-content {
    padding: 0;
    font-size: @font-size;
    font-weight: 600;
    color: @text-color;
    height: 100%;
    display: flex;
    align-items: center;
    position: relative;
    transition: color 0.2s ease;

    &.n-menu-item-content--selected {
      color: @active-color;

      &::after {
        content: '';
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
}

.user-info-trigger {
  display: flex;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:focus-visible {
    outline: 2px solid var(--oj-color-primary);
    outline-offset: 2px;
  }

  .username {
    margin-left: 10px;
    font-size: 14px;
    font-weight: 600;
    color: @text-color;
  }
}

@media (max-width: 1024px) {
  .menu-wrapper {
    margin-left: 20px;
  }

  :deep(.n-menu-item) {
    margin-right: 18px;
  }

  .user-info-trigger .username {
    display: none;
  }
}
</style>
