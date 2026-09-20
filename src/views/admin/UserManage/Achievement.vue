<template>
  <div class="achievement-manage-page">
    <n-card :bordered="false" title="成就认证审核">
      <!-- 筛选区 -->
      <n-space vertical :size="16" style="margin-bottom: 16px">
        <n-space :size="12" align="center">
          <n-input
            v-model:value="filters.keyword"
            placeholder="用户名 / UID / 事项名称"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
          <n-select
            v-model:value="filters.status"
            placeholder="状态"
            clearable
            :options="statusOptions"
            style="width: 140px"
          />
          <n-select
            v-model:value="filters.collegeId"
            placeholder="学院"
            clearable
            filterable
            :options="collegeOptions"
            style="width: 200px"
          />
          <n-button type="primary" @click="handleSearch">查询</n-button>
          <n-button @click="resetFilters">重置</n-button>
        </n-space>
      </n-space>

      <!-- 列表 -->
      <n-data-table
        remote
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: AchievementApplication) => String(row.id)"
        :scroll-x="1500"
      />
    </n-card>

    <!-- 申请详情（展示说明 + 附件）模态框 -->
    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="成就申请详情"
      style="width: 700px; max-width: 90vw"
    >
      <n-space v-if="detailRow" vertical :size="12">
        <n-descriptions :column="2" label-placement="left" bordered size="small">
          <n-descriptions-item label="UID">{{ detailRow.uid }}</n-descriptions-item>
          <n-descriptions-item label="用户名">{{ detailRow.username }}</n-descriptions-item>
          <n-descriptions-item label="事项名称">{{ detailRow.title }}</n-descriptions-item>
          <n-descriptions-item label="提交时间">{{ formatFullTime(detailRow.submitTime) }}</n-descriptions-item>
          <n-descriptions-item label="状态">{{ statusText(detailRow.status) }}</n-descriptions-item>
          <n-descriptions-item label="申请说明">{{ detailRow.description || '-' }}</n-descriptions-item>
        </n-descriptions>
        <n-space align="center">
          <n-text depth="3">证明附件：</n-text>
          <a
            v-if="isExternalFile(detailRow.fileUrl)"
            :href="detailRow.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >查看外部附件</a>
          <n-button
            v-else-if="detailRow.fileUrl"
            size="small"
            type="info"
            secondary
            :loading="submitting"
            @click="handleDownloadFile(detailRow)"
          >
            下载本地附件
          </n-button>
          <n-text v-else depth="3">无</n-text>
        </n-space>
      </n-space>
    </n-modal>

    <!-- 打回原因模态框 -->
    <n-modal
      v-model:show="showRejectModal"
      preset="card"
      title="打回申请"
      style="width: 500px"
      :mask-closable="false"
    >
      <n-form label-placement="left" :label-width="80">
        <n-form-item label="打回原因" required>
          <n-input
            v-model:value="rejectReason"
            type="textarea"
            placeholder="请输入打回原因"
            :rows="4"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRejectModal = false">取消</n-button>
          <n-button type="error" :loading="submitting" @click="handleRejectSubmit">
            确认打回
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted } from 'vue';
import { NButton, NTag, NSpace, NText, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import {
  useAchievementManage,
  ACHIEVEMENT_STATUS,
  isExternalFile,
  type AchievementApplication,
} from '@/composables/admin/useAchievementManage';

const {
  loading,
  submitting,
  list,
  filters,
  pagination,
  statusOptions,
  collegeOptions,
  showRejectModal,
  rejectReason,
  showDetailModal,
  detailRow,
  fetchColleges,
  fetchList,
  handleSearch,
  resetFilters,
  openDetailModal,
  handleDownloadFile,
  handleApprove,
  openRejectModal,
  handleRejectSubmit,
} = useAchievementManage();

const statusText = (status: string) => {
  if (status === ACHIEVEMENT_STATUS.APPROVED) return '通过';
  if (status === ACHIEVEMENT_STATUS.REJECTED) return '打回';
  return '待处理';
};

const columns: DataTableColumns<AchievementApplication> = [
  {
    title: 'UID',
    key: 'uid',
    width: 140,
    ellipsis: { tooltip: true },
  },
  {
    title: '用户名',
    key: 'username',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: '比赛/事项名称',
    key: 'title',
    width: 220,
    ellipsis: { tooltip: true },
    render: (row) => h('span', { style: 'font-weight: 500' }, row.title),
  },
  {
    title: '申请说明',
    key: 'description',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.description || '-',
  },
  {
    title: '证明附件',
    key: 'file',
    width: 140,
    align: 'center',
    render(row) {
      if (!row.fileUrl) return h(NText, { depth: 3 }, () => '无');
      if (isExternalFile(row.fileUrl)) {
        return h(
          'a',
          { href: row.fileUrl, target: '_blank', rel: 'noopener noreferrer', style: 'color:#007BFF' },
          '外部附件',
        );
      }
      return h(
        NButton,
        {
          size: 'tiny',
          secondary: true,
          type: 'info',
          onClick: () => handleDownloadFile(row),
        },
        { default: () => '下载附件' },
      );
    },
  },
  {
    title: '提交时间',
    key: 'submitTime',
    width: 160,
    render: (row) => (row.submitTime ? formatFullTime(row.submitTime) : '-'),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const type = row.status === ACHIEVEMENT_STATUS.APPROVED
        ? 'success'
        : row.status === ACHIEVEMENT_STATUS.REJECTED ? 'error' : 'warning';
      return h(NTag, { type, size: 'small', bordered: false }, () => statusText(row.status));
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render(row) {
      const buttons = [
        h(
          NButton,
          {
            size: 'tiny',
            secondary: true,
            onClick: () => openDetailModal(row),
          },
          { default: () => '详情' },
        ),
      ];
      if (row.status === ACHIEVEMENT_STATUS.PENDING) {
        buttons.push(
          h(
            NButton,
            {
              size: 'tiny',
              type: 'primary',
              secondary: true,
              onClick: () => handleApprove(row),
            },
            { default: () => '通过' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              type: 'error',
              secondary: true,
              onClick: () => openRejectModal(row),
            },
            { default: () => '打回' },
          ),
        );
      }
      return h(NSpace, { size: 'small' }, { default: () => buttons });
    },
  },
];

onMounted(() => {
  void fetchColleges();
  void fetchList();
});
</script>

<style scoped lang="less">
.achievement-manage-page {
  :deep(.n-data-table) {
    font-size: 13px;
  }
}
</style>
