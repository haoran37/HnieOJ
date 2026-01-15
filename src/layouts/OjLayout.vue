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
}

.header-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--header-height);
  z-index: 1000;
  
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  background-color: #fff;
}

.content-limit-container {
  background-color: #EFEFEF;
  margin-top: var(--header-height);
  min-height: calc(100vh - var(--header-height) - 100px); 
}

.router-view-wrapper {
  width: 90%; 
  max-width: 1400px;
  margin: 0 auto; 
  padding: 20px 0;
  box-sizing: border-box;
}
</style>