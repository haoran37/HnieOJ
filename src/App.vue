<template>
  <n-config-provider>
    <n-modal-provider>
      <n-notification-provider>
        <MainPage />
      </n-notification-provider>
    </n-modal-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import MainPage from './views/MainPage.vue';

</script>


<style>
  body {
    --header-height: 60px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
