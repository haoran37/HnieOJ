<template>
  <div class="homework-problems">
    <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
      {{ error }}
    </n-alert>
    <n-data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :row-key="(row: any) => row.id"
      :single-line="false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, h } from 'vue';
import { useRouter } from 'vue-router';
import { checkProblem } from '@/utils/api';
import type { HomeworkDetail } from '@/composables/oj/useHomeworkDetail';

interface HomeworkProblemRow {
  id: number;
  displayId: string;
  problemCode: string;
  title: string;
}

const props = defineProps<{ detail: HomeworkDetail }>();
const router = useRouter();

const loading = ref(false);
const error = ref<string | null>(null);
const rows = ref<HomeworkProblemRow[]>([]);

// 局部序号：作业详情 id 变化/清空时作废更早的在途题目请求，避免旧响应覆盖新作业
let seq = 0;

const handleClick = (code: string) => {
  if (code) router.push(`/problem/${code}`);
};

// 作业题目只提供内部 problemId，必须经 checkProblem 换展示编号
const load = async () => {
  const current = ++seq;
  const list = props.detail.problems ?? [];
  if (!props.detail.id || list.length === 0) {
    rows.value = [];
    error.value = null;
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const next = await Promise.all(
      list.map(async (p) => {
        const check = await checkProblem(p.problemId);
        return {
          id: p.problemId,
          displayId: p.displayId ?? '',
          problemCode: check?.problemCode ?? '',
          title: check?.title ?? '',
        };
      }),
    );
    if (current !== seq) return;
    rows.value = next;
  } catch (err) {
    if (current !== seq) return;
    rows.value = [];
    error.value = err instanceof Error ? err.message : '作业题目加载失败';
  } finally {
    if (current === seq) loading.value = false;
  }
};

const columns = [
  { title: '#', key: 'displayId', width: 80, align: 'center' as const },
  {
    title: '标题',
    key: 'title',
    render(row: HomeworkProblemRow) {
      return h('a', {
        style: { textDecoration: 'none', color: '#2080f0', fontWeight: '500', cursor: 'pointer' },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          handleClick(row.problemCode);
        }
      }, row.title || row.problemCode || '-');
    }
  },
  {
    title: '编号',
    key: 'problemCode',
    width: 140,
    align: 'center' as const,
    render: (row: HomeworkProblemRow) => row.problemCode || '-'
  }
];

// id 变化（含清空）都必须重新走 load：空 id 分支会自增序号作废在途请求，
// 若在此处用 if(props.detail.id) 提前拦截，旧作业的迟到响应会覆盖已清空的列表。
watch(
  () => props.detail.id,
  () => {
    void load();
  },
  { immediate: true },
);
</script>
