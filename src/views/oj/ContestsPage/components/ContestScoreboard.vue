<template>
  <div class="contest-scoreboard">
    <n-empty :description="unavailableReason" class="empty-state" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useContestScoreboard } from '@/composables/oj/useContestScoreboard';

const route = useRoute();
const { unavailableReason, fetchScoreboard } = useContestScoreboard();

onMounted(() => {
  void fetchScoreboard(route.params.contestId as string);
});
</script>

<style scoped lang="less">
.contest-scoreboard {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-state {
    padding: 60px 0;
  }
}
</style>
