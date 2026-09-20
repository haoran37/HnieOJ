<template>
  <div class="change-page">
    <n-card :bordered="false" title="变动申请">
      <n-form inline label-placement="left" :show-feedback="false" class="search-bar">
        <n-form-item label="关键字">
          <n-input
            v-model:value="searchForm.keyword"
            placeholder="按学号 / 原因搜索"
            clearable
            @keyup.enter="handleSearch"
          />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="searchForm.status"
            :options="statusOptions"
            placeholder="全部状态"
            clearable
            style="width: 150px"
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="handleSearch">查询</n-button>
            <n-button @click="handleReset">重置</n-button>
          </n-space>
        </n-form-item>
      </n-form>

      <n-alert v-if="listError" type="error" :bordered="false" style="margin-bottom: 12px">
        {{ listError }}
        <template #action>
          <n-button size="small" @click="fetchChanges">重试</n-button>
        </template>
      </n-alert>

      <n-data-table
        remote
        :columns="columns"
        :data="changes"
        :loading="listLoading"
        :row-key="(row: ProfileChangeVo) => row.id"
        :pagination="false"
        :scroll-x="1300"
      />

      <div class="pagination-wrapper">
        <n-pagination
          :page="currentPage"
          :page-size="pageSize"
          :item-count="totalCount"
          show-size-picker
          :page-sizes="[10, 15, 20, 30, 50]"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </n-card>

    <n-modal
      :show="showReviewModal"
      preset="card"
      :title="reviewMode === 'approve' ? '通过身份变更申请' : '驳回身份变更申请'"
      :mask-closable="false"
      :style="{ width: 'auto', minWidth: '520px', maxWidth: '90vw' }"
      @update:show="handleReviewShowChange"
    >
      <n-form label-placement="left" label-width="90">
        <n-form-item label="申请用户">
          <n-input :value="reviewForm.uid" disabled />
        </n-form-item>
        <n-form-item :label="reviewMode === 'approve' ? '通过原因' : '驳回原因'" required>
          <n-input
            v-model:value="reviewForm.reason"
            type="textarea"
            :maxlength="1000"
            show-count
            :autosize="{ minRows: 3, maxRows: 8 }"
            :placeholder="reviewMode === 'approve' ? '请填写通过原因' : '请填写驳回原因'"
          />
        </n-form-item>
      </n-form>
      <n-alert v-if="reviewError" type="error" :bordered="false">{{ reviewError }}</n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button :disabled="saving" @click="closeReview">取消</n-button>
          <n-button
            :type="reviewMode === 'approve' ? 'success' : 'error'"
            :loading="saving"
            :disabled="saving"
            @click="submitReview"
          >
            {{ reviewMode === 'approve' ? '确认通过' : '确认驳回' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted } from 'vue';
import { NButton, NSpace, NTag, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { useUserChange } from '@/composables/admin/useUserChange';
import type { ProfileChangeVo } from '@/utils/api';

const {
  listLoading,
  saving,
  listError,
  reviewError,
  changes,
  totalCount,
  currentPage,
  pageSize,
  searchForm,
  showReviewModal,
  reviewMode,
  reviewForm,
  fetchChanges,
  handleSearch,
  handleReset,
  handlePageChange,
  handlePageSizeChange,
  openApprove,
  openReject,
  closeReview,
  handleReviewShowChange,
  submitReview,
  identityFields,
} = useUserChange();

const statusOptions = [
  { label: '待处理', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
];

const statusType = (status: string | null) => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  return 'warning';
};

const statusText = (status: string | null) => {
  if (status === 'APPROVED') return '已通过';
  if (status === 'REJECTED') return '已驳回';
  return '待处理';
};

const FIELD_LABELS: Array<[string, string]> = [
  ['realname', '实名'],
  ['college', '学院'],
  ['grade', '年级'],
  ['class', '班级'],
];

// 原值 → 目标值，仅 4 项身份字段（UID 不可变更）
const renderDiff = (row: ProfileChangeVo) => {
  const original = identityFields(row.original);
  const proposed = identityFields(row.proposed);
  return h(
    'div',
    { class: 'diff-cell' },
    FIELD_LABELS.map(([key, label]) =>
      h('div', { key }, `${label}：${original[key]} → ${proposed[key]}`),
    ),
  );
};

const columns: DataTableColumns<ProfileChangeVo> = [
  { title: '申请ID', key: 'id', width: 90 },
  { title: 'UID', key: 'uid', width: 130 },
  { title: '原因', key: 'reason', width: 160, className: 'cell-wrap' },
  { title: '变更内容（原值 → 目标值）', key: 'diff', minWidth: 300, render: renderDiff },
  {
    title: '提交时间',
    key: 'gmtCreate',
    width: 170,
    render: (row) => formatFullTime(row.gmtCreate),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: statusType(row.status), bordered: false },
        () => statusText(row.status),
      ),
  },
  {
    title: '审核信息',
    key: 'review',
    width: 220,
    render: (row) => {
      if (row.status === 'PENDING') return '-';
      return h('div', { class: 'review-cell' }, [
        h('div', `审核人：${row.reviewerUid || '-'}`),
        h('div', `原因：${row.reviewReason || '-'}`),
        h('div', `时间：${formatFullTime(row.reviewAt)}`),
      ]);
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (row) => {
      if (row.status !== 'PENDING') return '-';
      return h(NSpace, { size: 4 }, {
        default: () => [
          h(
            NButton,
            {
              size: 'tiny',
              type: 'success',
              secondary: true,
              disabled: saving.value,
              onClick: () => openApprove(row),
            },
            { default: () => '通过' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              type: 'error',
              secondary: true,
              disabled: saving.value,
              onClick: () => openReject(row),
            },
            { default: () => '驳回' },
          ),
        ],
      });
    },
  },
];

onMounted(() => {
  void fetchChanges();
});
</script>

<style scoped lang="less">
.change-page {
  :deep(.n-card) {
    width: 100%;
  }
}
.search-bar {
  margin-bottom: 12px;
  flex-wrap: wrap;
  row-gap: 8px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
:deep(.cell-wrap) {
  white-space: normal;
  word-break: break-word;
}
:deep(.diff-cell div),
:deep(.review-cell div) {
  line-height: 1.6;
  word-break: break-word;
}
</style>
