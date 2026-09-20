<template>
  <div class="user-list-page">
    <n-empty description="个人题单暂未开放：后端题单列表不支持按用户筛选" style="padding: 80px 0" />
  </div>
</template>

<script setup lang="ts">
// 题单列表接口不支持 uid 过滤，避免用全站题单冒充“我的”。
</script>
