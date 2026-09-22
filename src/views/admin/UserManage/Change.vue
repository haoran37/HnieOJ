<template>
  <div class="change-page">
    <n-card :bordered="false" title="变动申请">
      <template #header-extra>
        <n-space :size="12" align="center">
          <n-text depth="3">已选 {{ selectedIds.length }} 条待处理申请</n-text>
          <n-button
            type="success"
            :disabled="selectedIds.length === 0 || listLoading || saving"
            :loading="saving"
            @click="openBatchApprove"
          >
            批量通过
          </n-button>
        </n-space>
      </template>
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
        :checked-row-keys="selectedIds"
        :pagination="false"
        :scroll-x="1300"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />

      <!-- 批量通过结果：持久显示成功数、失败数及每条失败申请 ID 与原因 -->
      <n-alert
        v-if="batchResult"
        :type="batchResult.failedCount > 0 ? 'warning' : 'success'"
        :bordered="false"
        :title="`批量通过结果：成功 ${batchResult.successCount} 条，失败 ${batchResult.failedCount} 条`"
        style="margin-top: 12px"
      >
        <n-space vertical :size="4">
          <n-text v-if="batchResult.failures.length === 0" depth="3">全部申请均已通过</n-text>
          <n-text v-for="failure in batchResult.failures" :key="failure.id" depth="3">
            申请 #{{ failure.id }}：{{ failure.reason }}
          </n-text>
        </n-space>
        <template #action>
          <n-button size="small" @click="fetchChanges">重新读取列表</n-button>
        </template>
      </n-alert>
      <n-alert
        v-if="batchError"
        type="error"
        :bordered="false"
        title="批量通过失败"
        style="margin-top: 12px"
      >
        {{ batchError }}
        <template #action>
          <n-button size="small" @click="fetchChanges">重新读取列表</n-button>
        </template>
      </n-alert>

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
      :title="reviewMode === 'approve' ? '通过资料变更申请' : '驳回资料变更申请'"
      :mask-closable="false"
      :close-on-esc="!saving"
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
  selectedIds,
  batchResult,
  batchError,
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
  handleCheckedRowKeysChange,
  openBatchApprove,
  changedFields,
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

// 原值 → 目标值：只列出本次申请真正变化的字段（可能是身份字段，也可能是联系/社交字段）
const renderDiff = (row: ProfileChangeVo) => {
  const rows = changedFields(row.original, row.proposed);
  if (rows.length === 0) {
    return h('div', { class: 'diff-cell' }, [h('div', { key: 'none' }, '无字段变更')]);
  }
  return h(
    'div',
    { class: 'diff-cell' },
    rows.map((item) =>
      h('div', { key: item.label }, `${item.label}：${item.from} → ${item.to}`),
    ),
  );
};

const columns: DataTableColumns<ProfileChangeVo> = [
  {
    // 行 key 为数字申请 id：仅当前页待处理行可选，列表加载/写操作在途时禁用
    type: 'selection',
    disabled: (row) => listLoading.value || saving.value || row.status !== 'PENDING',
  },
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
              disabled: saving.value || listLoading.value,
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
              disabled: saving.value || listLoading.value,
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
