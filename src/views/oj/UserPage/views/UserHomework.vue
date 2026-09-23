<template>
  <n-card title="班级作业" :bordered="false">
    <n-alert v-if="error" type="error">{{ error }}</n-alert>
    <n-data-table v-else :columns="columns" :data="rows" :loading="loading" :pagination="false" />
    <n-empty v-if="!loading && !error && !rows.length" description="暂无班级作业" />
    <n-pagination v-if="total > pageSize" v-model:page="page" :page-size="pageSize" :item-count="total" style="margin-top: 16px" />
  </n-card>
</template>

<script setup lang="ts">
import { h, ref, watch } from 'vue';
import { NButton, type DataTableColumns } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import { getHomeworks, getUserDetail, type HomeworkListVo } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

const route = useRoute();
const router = useRouter();
const rows = ref<HomeworkListVo[]>([]);
const loading = ref(false);
const error = ref('');
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const columns: DataTableColumns<HomeworkListVo> = [
  { title: '作业', key: 'title', render: row => h(NButton, { text: true, type: 'primary', onClick: () => router.push(`/homework/${row.id}`) }, { default: () => row.title }) },
  { title: '题数', key: 'problemCount', width: 80 },
  { title: '截止时间', key: 'endTime', width: 190, render: row => formatFullTime(row.endTime) },
];
let seq = 0;
watch(() => route.params.uid, () => { page.value = 1; });
watch(() => [route.params.uid, page.value] as const, async ([uid, currentPage]) => {
  const current = ++seq;
  loading.value = true;
  error.value = '';
  try {
    const user = await getUserDetail(String(uid));
    if (current !== seq) return;
    if (!user.classId) { rows.value = []; total.value = 0; return; }
    const result = await getHomeworks(currentPage, pageSize, undefined, user.classId);
    if (current === seq) { rows.value = result.list; total.value = result.total; }
  } catch (cause) {
    if (current === seq) { rows.value = []; error.value = cause instanceof Error ? cause.message : '获取作业失败'; }
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
</script>
