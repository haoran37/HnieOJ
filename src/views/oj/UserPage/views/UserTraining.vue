<template>
  <n-card title="收藏的题单" :bordered="false">
    <n-alert v-if="!isSelf" type="info">收藏的题单仅本人可见</n-alert>
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>
    <n-data-table v-else :columns="columns" :data="rows" :loading="loading" :pagination="{ pageSize: 10 }" />
    <n-empty v-if="isSelf && !loading && !error && !rows.length" description="暂无收藏题单" />
  </n-card>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';
import { NButton, useMessage, type DataTableColumns } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import { getFavorites, getTrainingInformation, type TrainingDetailVo } from '@/utils/api';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const store = useUserStore();
const message = useMessage();
const isSelf = computed(() => String(route.params.uid) === store.userInfo?.id);
const rows = ref<TrainingDetailVo[]>([]);
const loading = ref(false);
const error = ref('');
const columns: DataTableColumns<TrainingDetailVo> = [
  { title: '题单', key: 'title', render: row => h(NButton, { text: true, type: 'primary', onClick: () => router.push(`/training/${row.id}`) }, { default: () => row.title }) },
  { title: '作者', key: 'author', width: 130 },
  { title: '题数', key: 'problemCount', width: 80 },
];
let seq = 0;
watch(isSelf, async allowed => {
  const current = ++seq;
  rows.value = [];
  if (!allowed) return;
  loading.value = true;
  error.value = '';
  try {
    const favorites = await getFavorites('training');
    const details = await Promise.allSettled(favorites.map(item => getTrainingInformation(item.targetId)));
    if (current === seq) {
      rows.value = details.filter((result): result is PromiseFulfilledResult<TrainingDetailVo> => result.status === 'fulfilled').map(result => result.value);
      const skipped = details.length - rows.value.length;
      if (skipped) message.warning(`${skipped} 个题单详情加载失败，已跳过`);
    }
  } catch (cause) {
    if (current === seq) error.value = cause instanceof Error ? cause.message : '获取收藏题单失败';
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
</script>
