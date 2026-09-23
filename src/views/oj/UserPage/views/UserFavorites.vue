<template>
  <n-card title="我的收藏" :bordered="false">
    <n-alert v-if="!isSelf" type="info">收藏仅本人可见</n-alert>
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>
    <n-data-table v-else :columns="columns" :data="rows" :loading="loading" :pagination="{ pageSize: 20 }" />
    <n-empty v-if="isSelf && !loading && !error && !rows.length" description="暂无收藏" />
  </n-card>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';
import { NButton, useMessage, type DataTableColumns } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import { getFavorites, removeFavorite, type UserFavoriteVo, type FavoriteType } from '@/utils/api';
import { useUserStore } from '@/stores/userStore';
import { formatFullTime } from '@/composables/useTime';

const route = useRoute();
const router = useRouter();
const store = useUserStore();
const message = useMessage();
const isSelf = computed(() => String(route.params.uid) === store.userInfo?.id);
const rows = ref<UserFavoriteVo[]>([]);
const loading = ref(false);
const error = ref('');
const pendingIds = ref(new Set<number>());
const labels: Record<FavoriteType, string> = { problem: '题目', training: '题单', contest: '比赛', discussion: '讨论' };
const pathFor = (row: UserFavoriteVo) => ({
  problem: `/problem/${row.targetId}`,
  training: `/training/${row.targetId}`,
  contest: `/contest/${row.targetId}`,
  discussion: `/discuss/${row.targetId}`,
})[row.targetType];
const remove = async (row: UserFavoriteVo) => {
  if (pendingIds.value.has(row.id)) return;
  pendingIds.value = new Set([...pendingIds.value, row.id]);
  try {
    await removeFavorite(row.targetType, row.targetId);
    rows.value = rows.value.filter(item => item.id !== row.id);
  } catch (cause) {
    message.error(cause instanceof Error ? cause.message : '取消收藏失败');
  } finally {
    const next = new Set(pendingIds.value);
    next.delete(row.id);
    pendingIds.value = next;
  }
};
const columns: DataTableColumns<UserFavoriteVo> = [
  { title: '类型', key: 'targetType', width: 90, render: row => labels[row.targetType] },
  { title: '内容', key: 'targetId', render: row => h(NButton, { text: true, type: 'primary', onClick: () => router.push(pathFor(row)) }, { default: () => `${labels[row.targetType]} ${row.targetId}` }) },
  { title: '收藏时间', key: 'gmtCreate', width: 190, render: row => formatFullTime(row.gmtCreate) },
  { title: '操作', key: 'remove', width: 90, render: row => h(NButton, { text: true, type: 'error', loading: pendingIds.value.has(row.id), disabled: pendingIds.value.has(row.id), onClick: () => remove(row) }, { default: () => '取消收藏' }) },
];
let seq = 0;
watch(isSelf, async allowed => {
  const current = ++seq;
  rows.value = [];
  if (!allowed) return;
  loading.value = true;
  error.value = '';
  try {
    const data = await getFavorites();
    if (current === seq) rows.value = data;
  } catch (cause) {
    if (current === seq) error.value = cause instanceof Error ? cause.message : '获取收藏失败';
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
</script>
