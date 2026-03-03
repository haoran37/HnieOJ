<template>
  <n-config-provider
    :theme="appStore.naiveTheme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-loading-bar-provider>
      <n-message-provider>
        <n-dialog-provider>
          <n-notification-provider>
            <router-view />
          </n-notification-provider>
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import type { GlobalThemeOverrides } from 'naive-ui';
  import { useAppStore } from '@/stores/app.ts';
  import { zhCN, dateZhCN } from 'naive-ui';

  const themeOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#2F6EE5',
      primaryColorHover: '#4A84EA',
      primaryColorPressed: '#2658B8',
      primaryColorSuppl: '#2F6EE5',
      infoColor: '#2F6EE5',
      infoColorHover: '#4A84EA',
      infoColorPressed: '#2658B8',
      infoColorSuppl: '#2F6EE5',
    },
  };

  const appStore = useAppStore();
</script>
<style>
body {
  --header-height: 60px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.3s ease;
  margin: 0;
  color: var(--oj-text-primary);
  background: var(--oj-bg-page);
}

#app {
  min-height: 100vh;
}
</style>
