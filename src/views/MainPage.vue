<template>
  <n-space vertical size="large">
     <n-layout>
      <n-layout-header>
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
.content-limit-container {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 5%; // 左右自动留空
  box-sizing: border-box;
}
</style>