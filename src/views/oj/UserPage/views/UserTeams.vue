<template>
  <n-card title="我的比赛团队" :bordered="false">
    <n-alert v-if="!isSelf" type="info">比赛团队仅本人可见</n-alert>
    <n-alert v-else-if="error" type="error">{{ error }}</n-alert>
    <n-data-table v-else :columns="columns" :data="rows" :loading="loading" :pagination="{ pageSize: 10 }" />
    <n-empty v-if="isSelf && !loading && !error && !rows.length" description="暂无比赛团队" />
  </n-card>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';
import { NButton, type DataTableColumns } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import { getMyContestTeams, type MyContestTeamVo } from '@/utils/api';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const store = useUserStore();
const isSelf = computed(() => String(route.params.uid) === store.userInfo?.id);
const rows = ref<MyContestTeamVo[]>([]);
const loading = ref(false);
const error = ref('');
const columns: DataTableColumns<MyContestTeamVo> = [
  { title: '团队', key: 'teamName' },
  { title: '比赛', key: 'contestTitle', render: row => h(NButton, { text: true, type: 'primary', onClick: () => router.push(`/contest/${row.contestId}`) }, { default: () => row.contestTitle }) },
  { title: '队长 UID', key: 'captainUid', width: 130 },
];
let seq = 0;
watch(isSelf, async allowed => {
  const current = ++seq;
  rows.value = [];
  if (!allowed) return;
  loading.value = true;
  error.value = '';
  try {
    const data = await getMyContestTeams();
    if (current === seq) rows.value = data;
  } catch (cause) {
    if (current === seq) error.value = cause instanceof Error ? cause.message : '获取团队失败';
  } finally { if (current === seq) loading.value = false; }
}, { immediate: true });
</script>
