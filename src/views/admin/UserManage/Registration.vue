<template>
  <div class="registration-page">
    <n-card :bordered="false" title="注册审核">
      <template #header-extra>
        <n-space>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button type="primary" disabled>
                <template #icon>
                  <n-icon :size="18"><CloudUploadOutline /></n-icon>
                </template>
                上传名单自动通过
              </n-button>
            </template>
            后端未提供注册名单批量导入上传接口，暂不可用
          </n-tooltip>
          <n-button
            type="success"
            :disabled="selectedIds.length === 0"
            :loading="submitting"
            @click="handleBatchApprove"
          >
            <template #icon>
              <n-icon :size="18"><CheckmarkDoneOutline /></n-icon>
            </template>
            批量通过
          </n-button>
        </n-space>
      </template>

      <n-alert type="warning" :bordered="false" style="margin-bottom: 12px">
        「上传 Excel 名单自动审核」暂未开放，请逐条或批量审核注册申请。
      </n-alert>

      <n-space :size="12" align="center" style="margin-bottom: 12px">
        <n-input
          v-model:value="keyword"
          placeholder="UID / 用户名 / 邮箱"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
        <n-select
          v-model:value="statusFilter"
          placeholder="状态"
          clearable
          :options="statusOptions"
          style="width: 140px"
        />
        <n-button type="primary" @click="handleSearch">查询</n-button>
        <n-button @click="resetFilters">重置</n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="registrationList"
        :loading="loading"
        :row-key="(row: RegistrationItem) => row.uid"
        v-model:checked-row-keys="selectedIds"
        :scroll-x="1400"
      />

      <div class="pagination-wrapper">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="pagination.pageSizes"
          show-size-picker
          @update:page="pagination.onChange"
          @update:page-size="pagination.onUpdatePageSize"
        />
      </div>
    </n-card>

    <n-modal
      v-model:show="showRejectModal"
      preset="card"
      title="打回申请"
      :mask-closable="false"
      style="width: auto; min-width: 600px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="80">
        <n-form-item label="用户">
          <n-input :value="`${rejectForm.name} (${rejectForm.uid})`" disabled />
        </n-form-item>
        <n-form-item label="邮箱">
          <n-input :value="rejectForm.email" disabled />
        </n-form-item>
        <n-form-item label="打回原因" required>
          <n-input
            v-model:value="rejectForm.reason"
            type="textarea"
            placeholder="请输入打回原因（真实提交给后端）"
            :rows="4"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRejectModal = false">取消</n-button>
          <n-button type="error" :loading="submitting" @click="handleRejectSubmit">
            确定打回
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted } from 'vue';
import { NButton, NSpace, NTag, NIcon, type DataTableColumns } from 'naive-ui';
import { CloudUploadOutline, CheckmarkDoneOutline } from '@vicons/ionicons5';
import {
  useRegistration,
  REGISTER_STATUS,
  type RegistrationItem,
} from '@/composables/admin/useRegistration';

const {
  loading,
  submitting,
  registrationList,
  selectedIds,
  keyword,
  statusFilter,
  pagination,
  showRejectModal,
  rejectForm,
  fetchRegistrations,
  resetFilters,
  handleApprove,
  openRejectModal,
  handleRejectSubmit,
  handleBatchApprove,
  formatFullTime,
} = useRegistration();

const statusOptions = [
  { label: '待处理', value: REGISTER_STATUS.PENDING },
  { label: '已通过', value: REGISTER_STATUS.APPROVED },
  { label: '已打回', value: REGISTER_STATUS.REJECTED },
];

const handleSearch = () => {
  pagination.page = 1;
  void fetchRegistrations();
};

const getStatusType = (status: number) => {
  if (status === REGISTER_STATUS.APPROVED) return 'success';
  if (status === REGISTER_STATUS.REJECTED) return 'error';
  return 'warning';
};

const getStatusText = (status: number) => {
  if (status === REGISTER_STATUS.APPROVED) return '通过';
  if (status === REGISTER_STATUS.REJECTED) return '打回';
  return '待处理';
};

const columns: DataTableColumns<RegistrationItem> = [
  { type: 'selection' },
  {
    title: 'UID',
    key: 'uid',
    width: 130,
    ellipsis: { tooltip: true },
  },
  {
    title: '用户名',
    key: 'username',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: '专业班级',
    key: 'major',
    width: 130,
    ellipsis: { tooltip: true },
  },
  {
    title: '学院',
    key: 'college',
    width: 160,
    ellipsis: { tooltip: true },
  },
  {
    title: '年级',
    key: 'grade',
    width: 90,
    ellipsis: { tooltip: true },
  },
  {
    title: 'QQ',
    key: 'qq',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: '邮箱',
    key: 'email',
    width: 200,
    ellipsis: { tooltip: true },
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
    width: 90,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: getStatusType(row.status), bordered: false },
        () => getStatusText(row.status),
      ),
  },
  {
    title: '打回原因',
    key: 'replyInfo',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.replyInfo || '-',
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render(row) {
      if (row.status !== REGISTER_STATUS.PENDING) {
        return null;
      }
      return h(NSpace, { size: 4 }, {
        default: () => [
          h(
            NButton,
            {
              size: 'tiny',
              type: 'success',
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
        ],
      });
    },
  },
];

onMounted(() => {
  void fetchRegistrations();
});
</script>

<style scoped lang="less">
.registration-page {
  :deep(.n-data-table) {
    font-size: 13px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
