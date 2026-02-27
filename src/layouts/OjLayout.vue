<template>
  <n-layout class="oj-layout">
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
</template>

<style scoped lang="less">
.oj-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--oj-bg-page);
}

.header-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--header-height);
  z-index: 1000;
  padding: 0;
  background-color: #fff;
}

.content-limit-container {
  background: var(--oj-bg-page);
  margin-top: var(--header-height);
  min-height: calc(100vh - var(--header-height) - 100px);
}

.router-view-wrapper {
  width: min(90%, 1400px);
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 0 24px;
  box-sizing: border-box;
}
</style>
