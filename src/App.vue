<template>
  <NConfigProvider>
    <MainPage />
  </NConfigProvider>
</template>

<script setup lang="ts">
  import MainPage from './views/MainPage.vue';

</script>


<style>
  body {
    /* overflow: hidden; */
    --header-height: 60px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
