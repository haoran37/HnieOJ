<template>
  <BoardCard title="月度排名" class="rank-table-card">
    <template #icon>
      <n-icon size="22"><BarChartOutline /></n-icon>
    </template>

    <n-spin :show="loading">
      <n-alert v-if="error" type="error">{{ error }}</n-alert>
      <n-empty v-else-if="!rows.length" :description="userStore.isLogin ? '本月暂无解题记录' : '登录后查看月度排名'" style="padding: 40px 0" />
      <n-data-table v-else :columns="columns" :data="rows" :pagination="false" />
    </n-spin>

    <div class="card-footer">
      <div></div>
      <n-button text class="blue-link" @click="$router.push('/rank')">
        View all ->
      </n-button>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { BarChartOutline } from '@vicons/ionicons5';
import { ref, watch } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import BoardCard from '@/components/BoardCard.vue';
import { getSolveRankings, type UserSolveRankVo } from '@/utils/api';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
const rows = ref<UserSolveRankVo[]>([]);
const loading = ref(false);
const error = ref('');
let seq = 0;
const columns: DataTableColumns<UserSolveRankVo> = [
  { title: '#', key: 'rank', width: 50 },
  { title: '用户', key: 'username' },
  { title: '本月解决', key: 'monthlySolved', width: 100 },
];
watch(() => userStore.isLogin, async loggedIn => {
  const current = ++seq;
  rows.value = [];
  error.value = '';
  if (!loggedIn) { loading.value = false; return; }
  loading.value = true;
  try {
    const result = await getSolveRankings('month');
    if (current === seq) rows.value = result.filter(row => row.monthlySolved > 0).slice(0, 10);
  } catch (cause) {
    if (current === seq) error.value = cause instanceof Error ? cause.message : '获取月榜失败';
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
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
