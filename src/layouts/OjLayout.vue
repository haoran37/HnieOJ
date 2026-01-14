<template>
  <n-space vertical size="large">
    <n-layout>
      <n-layout-header class="header-container">
        <TopNavi />
      </n-layout-header>
      <n-layout-content class="content-limit-container">
        <div class="router-view-wrapper">
          <RouterView />
        </div>
      </n-layout-content>
      <n-layout-footer>
        <PageFooter />
      </n-layout-footer>
    </n-layout>
  </n-space>
</template>

<style scoped lang="less">
.header-container {
  z-index: 100;
  position: relative;
  overflow: visible;
  padding: 0;
}

.content-limit-container {
  background-color: #EFEFEF;
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.router-view-wrapper {
  width: 90%; 
  margin: 0 auto; 
  padding: 20px 0;
  box-sizing: border-box;
}
</style>