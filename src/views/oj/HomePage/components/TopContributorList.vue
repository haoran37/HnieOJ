<template>
  <BoardCard title="Top 贡献" class="top-contribution-card">
    <template #icon>
      <n-icon size="22"><RibbonOutline /></n-icon>
    </template>

    <n-empty :description="reason" style="padding: 40px 0" />

    <div class="card-footer">
      <div></div>
      <n-button text class="blue-link" @click="$router.push('/rank')">
        View all ->
      </n-button>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { RibbonOutline } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';

// 后端暂无排名/评分/贡献榜接口，明确标注暂未开放，不展示假数据。
const reason = '暂未开放：后端暂未提供排行榜接口';
</script>

<style scoped lang="less">
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #fff;

  .blue-link {
    color: #2080f0;
    font-size: 13px;
    font-weight: 500;
    &:hover { text-decoration: underline; }
  }
}
</style>
