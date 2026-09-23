<template>
  <n-card title="发布的讨论" :bordered="false">
    <n-alert v-if="error" type="error">{{ error }}</n-alert>
    <n-data-table v-else :columns="columns" :data="rows" :loading="loading" :pagination="false" />
    <n-empty v-if="!loading && !error && !rows.length" description="暂无讨论" />
    <n-pagination v-if="total > pageSize" v-model:page="page" :page-size="pageSize" :item-count="total" style="margin-top: 16px" />
  </n-card>
</template>

<script setup lang="ts">
import { h, ref, watch } from 'vue';
import { NButton, type DataTableColumns } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import { getDiscussions, type DiscussionListVo } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

const route = useRoute();
const router = useRouter();
const rows = ref<DiscussionListVo[]>([]);
const loading = ref(false);
const error = ref('');
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const columns: DataTableColumns<DiscussionListVo> = [
  { title: '标题', key: 'title', render: row => h(NButton, { text: true, type: 'primary', onClick: () => router.push(`/discuss/${row.id}`) }, { default: () => row.title }) },
  { title: '分类', key: 'category', width: 120 },
  { title: '回复', key: 'answerCount', width: 80 },
  { title: '发布时间', key: 'gmtCreate', width: 190, render: row => formatFullTime(row.gmtCreate) },
];
let seq = 0;
watch(() => route.params.uid, () => { page.value = 1; });
watch(() => [route.params.uid, page.value] as const, async ([uid, currentPage]) => {
  const current = ++seq;
  loading.value = true;
  error.value = '';
  try {
    const result = await getDiscussions(currentPage, pageSize, { uid: String(uid) });
    if (current === seq) { rows.value = result.list; total.value = result.total; }
  } catch (cause) {
    if (current === seq) { rows.value = []; error.value = cause instanceof Error ? cause.message : '获取讨论失败'; }
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
</script>
