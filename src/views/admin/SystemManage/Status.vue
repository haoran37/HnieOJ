<template>
  <div class="outbox-page">
    <n-card :bordered="false" title="判题任务投递（Outbox）">
      <n-alert type="info" :bordered="false" class="mb-4">
        本页仅展示判题任务投递记录（outbox），与批量重判任务不是同一概念；批量重判请前往「重判题目」页。
      </n-alert>

      <n-space vertical :size="16">
        <n-space>
          <n-select
            v-model:value="filters.status"
            :options="statusOptions"
            placeholder="全部状态"
            clearable
            style="width: 160px"
          />
          <n-input
            v-model:value="filters.submissionId"
            placeholder="提交编号"
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
          <n-input
            v-model:value="filters.judgeTaskId"
            placeholder="判题任务编号"
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
          <n-button type="primary" @click="handleSearch">筛选</n-button>
          <n-button @click="handleReset">重置</n-button>
          <n-button @click="fetchOutbox">刷新</n-button>
        </n-space>

        <n-data-table
          remote
          :columns="columns"
          :data="list"
          :loading="loading"
          :pagination="pagination"
          :scroll-x="1400"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue';
import { NTag, NButton, NSpace, NTooltip, useMessage } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import {
  getJudgeOutbox,
  retryJudgeOutbox,
  type JudgeTaskOutboxVo,
} from '@/utils/api';

const message = useMessage();

const STATUS_META: Record<string, { text: string; type: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  pending: { text: '待发送', type: 'info' },
  processing: { text: '处理中', type: 'warning' },
  sent: { text: '已发送', type: 'success' },
  failed: { text: '失败', type: 'error' },
  exhausted: { text: '已耗尽', type: 'error' },
};

const statusOptions = [
  { label: '待发送', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已发送', value: 'sent' },
  { label: '失败', value: 'failed' },
  { label: '已耗尽', value: 'exhausted' },
];

const loading = ref(false);
const retryingId = ref<number | null>(null);
const list = ref<JudgeTaskOutboxVo[]>([]);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
});

const filters = reactive({
  status: null as string | null,
  submissionId: '',
  judgeTaskId: '',
});

let fetchSeq = 0;

const fetchOutbox = async () => {
  const seq = ++fetchSeq;
  loading.value = true;
  try {
    const data = await getJudgeOutbox({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
      submissionId: filters.submissionId,
      judgeTaskId: filters.judgeTaskId,
    });
    if (seq !== fetchSeq) return;
    list.value = data.list ?? [];
    pagination.itemCount = data.total ?? 0;
  } catch (error) {
    if (seq !== fetchSeq) return;
    list.value = [];
    pagination.itemCount = 0;
    message.error(error instanceof Error ? error.message : '判题投递列表加载失败');
  } finally {
    if (seq === fetchSeq) loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchOutbox();
};

const handleReset = () => {
  filters.status = null;
  filters.submissionId = '';
  filters.judgeTaskId = '';
  pagination.page = 1;
  fetchOutbox();
};

const handlePageChange = (page: number) => {
  pagination.page = page;
  fetchOutbox();
};

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  fetchOutbox();
};

const handleRetry = async (row: JudgeTaskOutboxVo) => {
  if (row.status === 'sent') {
    message.warning('已发送的任务不能重试');
    return;
  }
  retryingId.value = row.id;
  try {
    await retryJudgeOutbox(row.id);
    message.success('重试已提交，正在刷新状态');
    await fetchOutbox();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重试失败');
  } finally {
    retryingId.value = null;
  }
};

const columns = [
  { title: 'ID', key: 'id', width: 80 },
  {
    title: '提交编号',
    key: 'submissionId',
    width: 240,
    ellipsis: { tooltip: true },
    render: (row: JudgeTaskOutboxVo) => row.submissionId ?? '-'
  },
  {
    title: '判题任务编号',
    key: 'judgeTaskId',
    width: 240,
    ellipsis: { tooltip: true },
    render: (row: JudgeTaskOutboxVo) => row.judgeTaskId ?? '-'
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: JudgeTaskOutboxVo) {
      const meta = (row.status && STATUS_META[row.status]) || { text: row.status ?? '-', type: 'default' as const };
      return h(NTag, { type: meta.type, size: 'small', bordered: false }, { default: () => meta.text });
    }
  },
  {
    title: '重试次数',
    key: 'retryCount',
    width: 110,
    render: (row: JudgeTaskOutboxVo) => `${row.retryCount ?? 0}/${row.maxRetryCount ?? 0}`
  },
  {
    title: '发布尝试',
    key: 'publishAttempt',
    width: 100,
    render: (row: JudgeTaskOutboxVo) => row.publishAttempt ?? '-'
  },
  {
    title: '下次重试',
    key: 'nextRetryTime',
    width: 180,
    render: (row: JudgeTaskOutboxVo) => formatFullTime(row.nextRetryTime)
  },
  {
    title: '发送时间',
    key: 'sentTime',
    width: 180,
    render: (row: JudgeTaskOutboxVo) => formatFullTime(row.sentTime)
  },
  {
    title: '最后错误',
    key: 'lastError',
    width: 220,
    ellipsis: { tooltip: true },
    render(row: JudgeTaskOutboxVo) {
      if (!row.lastError) return '-';
      return h('span', { style: 'color:#d03050' }, row.lastError);
    }
  },
  {
    title: '创建时间',
    key: 'gmtCreate',
    width: 180,
    render: (row: JudgeTaskOutboxVo) => formatFullTime(row.gmtCreate)
  },
  {
    title: '操作',
    key: 'actions',
    width: 110,
    fixed: 'right',
    render(row: JudgeTaskOutboxVo) {
      const isSent = row.status === 'sent';
      const button = h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          secondary: true,
          disabled: isSent,
          loading: retryingId.value === row.id,
          onClick: () => handleRetry(row)
        },
        { default: () => '重试' }
      );
      return h(NSpace, {}, {
        default: () => [
          isSent
            ? h(NTooltip, {}, {
                trigger: () => button,
                default: () => '已发送的任务不能重试'
              })
            : button
        ]
      });
    }
  }
];

onMounted(() => {
  void fetchOutbox();
});
</script>

<style scoped lang="less">
.outbox-page {
  .mb-4 {
    margin-bottom: 16px;
  }
}
</style>
