<template>
  <div class="rank-page-container">
    <n-card :bordered="false" class="rank-card">
      <n-empty description="排行榜暂未开放：后端暂未提供排名接口" class="empty-state" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
// 后端 backend-routes.json 未收录任何排名接口，
// 因此本页明确标注暂未开放，不调用不存在的接口、不展示假数据。
</script>

<style scoped lang="less">
.rank-page-container {
  width: 100%;
  margin: 0 auto;
}
.rank-card {
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state {
  padding: 80px 0;
}
</style>
