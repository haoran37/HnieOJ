<template>
  <n-space vertical size="large">
    <n-layout>
      <n-layout-header class="header-container">
        <TopNavi />
      </n-layout-header>
      <n-layout-content class="content-limit-container">
         <RouterView />
      </n-layout-content>
      <n-layout-footer>
        <PageFooter />
      </n-layout-footer>
     </n-layout>
  </n-space>


</template>

<script lang="ts" setup name="MainPage">
  import { RouterView } from 'vue-router';
  import TopNavi from '@/components/TopNavi.vue';
  import PageFooter from '@/components/PageFooter.vue';

</script>

<style scoped lang="less">
.header-container {
  z-index: 100;
  position: relative;
  overflow: visible;
  padding: 0;
}

.content-limit-container {
  display: flex;
  align-items: flex-start;
  width: 100%;
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
  padding: 20px 5% 20px;
  box-sizing: border-box;
  background-color: #EFEFEF;
  position: relative;
  z-index: 1;
}
</style>