<template>
  <n-config-provider :theme="appStore.naiveTheme" :locale="zhCN" :date-locale="dateZhCN">
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
  import { useAppStore } from '@/stores/app.ts';
  import { zhCN, dateZhCN } from 'naive-ui';
  const appStore = useAppStore();
</script>
<style>
body {
  --header-height: 60px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.3s;
  margin: 0;
}
</style>