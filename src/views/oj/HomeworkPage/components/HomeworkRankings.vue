<template>
  <div class="homework-rankings">
    <n-empty :description="unavailableReason" class="empty-state" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useHomeworkRankings } from '@/composables/oj/useHomeworkRankings';

const route = useRoute();
const { unavailableReason, fetchRankings } = useHomeworkRankings();

onMounted(() => {
  void fetchRankings(route.params.homeworkId as string);
});
</script>

<style scoped lang="less">
.homework-rankings {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-state {
    padding: 60px 0;
  }
}
</style>
