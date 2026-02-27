<template>
  <n-layout has-sider class="admin-layout">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="appStore.collapsed"
      show-trigger
      class="admin-sider"
      @collapse="appStore.collapsed = true"
      @expand="appStore.collapsed = false"
    >
      <div class="logo-wrapper" :class="{ collapsed: appStore.collapsed }">
        <img src="@/assets/hie.svg" alt="HnieOJ logo" class="logo-img" width="32" height="32" />
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

    <n-layout class="main-layout" :native-scrollbar="false">
      <div class="flex-container">
        <n-layout-header bordered class="admin-header">
          <div class="header-left">
            <n-breadcrumb>
              <n-breadcrumb-item @click="router.push('/')">HnieOJ</n-breadcrumb-item>
              <n-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
                {{ item.meta?.title }}
              </n-breadcrumb-item>
            </n-breadcrumb>
          </div>

          <div class="header-right">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button circle quaternary aria-label="返回主站" @click="router.push('/')">
                  <template #icon><n-icon><HomeOutline /></n-icon></template>
                </n-button>
              </template>
              返回主站
            </n-tooltip>

            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button circle quaternary :aria-label="isFullScreen ? '退出全屏' : '进入全屏'" @click="toggleFullScreen">
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

            <n-switch :value="appStore.darkMode" size="medium" @update:value="appStore.toggleDarkMode">
              <template #checked-icon><n-icon><Moon /></n-icon></template>
              <template #unchecked-icon><n-icon><Sunny /></n-icon></template>
            </n-switch>
            <n-divider vertical />

            <n-dropdown :options="userOptions" @select="handleUserSelect">
              <button class="user-trigger" type="button" aria-label="打开管理员菜单">
                <n-avatar
                  round
                  size="small"
                  :src="userStore.userInfo?.avatar || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"
                />
                <span class="username">{{ userStore.userInfo?.username || 'Admin' }}</span>
              </button>
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
      </div>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { computed, h, isRef, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { NIcon } from 'naive-ui'
import type { MenuOption, DropdownOption } from 'naive-ui'
import { useUserStore } from '@/stores/userStore'
import { useAppStore } from '@/stores/app'
import { adminRouters } from '@/router/routers'
import {
  LogOutOutline,
  HomeOutline,
  ExpandOutline,
  ContractOutline,
  Moon,
  Sunny,
} from '@vicons/ionicons5'

type MenuRoute = RouteRecordRaw & {
  children?: MenuRoute[]
  meta?: RouteRecordRaw['meta'] & { title?: string; icon?: unknown; hideInMenu?: boolean }
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()

const isFullScreen = ref(false)

const toggleFullScreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      isFullScreen.value = true
      return
    }

    await document.exitFullscreen()
    isFullScreen.value = false
  } catch (error) {
    console.error('Toggle fullscreen failed:', error)
  }
}

const renderIcon = (icon: unknown) => {
  const component = isRef(icon) ? icon.value : icon
  return () => h(NIcon, null, { default: () => h(component as object) })
}

const buildMenu = (routes: MenuRoute[]): MenuOption[] => {
  return routes
    .filter((item) => !item.meta?.hideInMenu)
    .map((item) => {
      const option: MenuOption = {
        label: item.children
          ? String(item.meta?.title ?? item.name)
          : () => h(RouterLink, { to: { name: item.name as string } }, {
            default: () => String(item.meta?.title ?? item.name),
          }),
        key: String(item.name),
        icon: item.meta?.icon ? renderIcon(item.meta.icon) : undefined,
      }

      if (item.children?.length) {
        option.children = buildMenu(item.children)
      }

      return option
    })
}

const menuOptions = computed<MenuOption[]>(() => {
  return buildMenu((adminRouters.children ?? []) as MenuRoute[])
})

const activeKey = computed(() => (route.meta?.activeMenu as string) || (route.name as string))

const defaultExpandedKeys = computed(() => {
  return route.matched
    .map((item) => String(item.name))
    .filter((name) => name !== activeKey.value)
})

const breadcrumbs = computed(() => {
  return route.matched.filter((item) => item.meta?.title && item.path !== '/admin')
})

const userOptions: DropdownOption[] = [
  { label: '退出登录', key: 'logout', icon: renderIcon(LogOutOutline) },
]

const handleUserSelect = (key: string | number) => {
  if (key === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped lang="less">
.admin-layout {
  height: 100vh;
}

.flex-container {
  display: flex;
  flex-direction: column;
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
    font-weight: 700;
    color: var(--n-text-color);
    white-space: nowrap;
    opacity: 1;
    max-width: 150px;
    transition: opacity 0.3s ease, max-width 0.3s ease, margin 0.3s ease;
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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 10;
  backdrop-filter: blur(8px);
  background: color-mix(in srgb, var(--n-color) 92%, transparent);

  .header-left {
    display: flex;
    align-items: center;
    min-width: 0;
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
    border-radius: 8px;
    border: 0;
    background: transparent;
    color: inherit;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    &:focus-visible {
      outline: 2px solid var(--oj-color-primary);
      outline-offset: 2px;
    }
  }
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  background-color: rgba(245, 247, 249, 0.75);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>
