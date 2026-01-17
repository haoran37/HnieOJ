<template>
  <div class="registration-page">
    <n-card :bordered="false" title="注册审核">
      <template #header-extra>
        <n-space>
          <n-upload
            :max="1"
            accept=".xlsx,.xls"
            :show-file-list="false"
            :custom-request="handleExcelUpload"
          >
            <n-button type="primary">
              <template #icon>
                <n-icon :size="18"><CloudUploadOutline /></n-icon>
              </template>
              上传名单自动通过
            </n-button>
          </n-upload>
          <n-button
            type="success"
            :disabled="selectedIds.length === 0"
            @click="handleBatchApprove"
          >
            <template #icon>
              <n-icon :size="18"><CheckmarkDoneOutline /></n-icon>
            </template>
            批量通过
          </n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="paginatedList"
        :loading="loading"
        :row-key="(row: RegistrationItem) => row.uid"
        v-model:checked-row-keys="selectedIds"
        :scroll-x="1400"
      />

      <div class="pagination-wrapper">
        <n-pagination
          v-model:page="currentPage"
          :page-size="pageSize"
          :item-count="totalCount"
          show-size-picker
          :page-sizes="[10, 15, 20, 30, 50]"
          @update:page-size="pageSize = $event"
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
            placeholder="请输入打回原因，将通过邮件发送给用户"
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
import { h } from 'vue';
import { NButton, NSpace, NTag, NIcon, type DataTableColumns, type UploadCustomRequestOptions } from 'naive-ui';
import { CloudUploadOutline, CheckmarkDoneOutline, CheckmarkOutline, CloseOutline } from '@vicons/ionicons5';
import { useRegistration, type RegistrationItem } from '@/composables/admin/useRegistration';

const {
  loading,
  submitting,
  paginatedList,
  totalCount,
  selectedIds,
  currentPage,
  pageSize,
  showRejectModal,
  rejectForm,
  handleApprove,
  openRejectModal,
  handleRejectSubmit,
  handleBatchApprove,
  handleUploadExcel,
  formatFullTime
} = useRegistration();

// 处理Excel上传
const handleExcelUpload = async (options: UploadCustomRequestOptions) => {
  const { file } = options;
  if (file.file) {
    await handleUploadExcel(file.file as File);
  }
};

// 获取状态标签类型
const getStatusType = (status: string) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
};

// 获取状态文本
const getStatusText = (status: string) => {
  if (status === 'approved') return '通过';
  if (status === 'rejected') return '打回';
  return '待处理';
};

// 表格列配置
const columns: DataTableColumns<RegistrationItem> = [
  { type: 'selection' },
  {
    title: 'UID',
    key: 'uid',
    width: 130,
    ellipsis: { tooltip: true }
  },
  {
    title: '姓名',
    key: 'name',
    width: 100,
    ellipsis: { tooltip: true }
  },
  {
    title: '专业班级',
    key: 'major',
    width: 120,
    ellipsis: { tooltip: true }
  },
  {
    title: '学院',
    key: 'college',
    width: 160,
    ellipsis: { tooltip: true }
  },
  {
    title: 'QQ',
    key: 'qq',
    width: 110,
    ellipsis: { tooltip: true }
  },
  {
    title: '手机号',
    key: 'phone',
    width: 120,
    ellipsis: { tooltip: true }
  },
  {
    title: '邮箱',
    key: 'email',
    width: 180,
    ellipsis: { tooltip: true }
  },
  {
    title: 'IP',
    key: 'ip',
    width: 130,
    ellipsis: { tooltip: true }
  },
  {
    title: '提交时间',
    key: 'submitTime',
    width: 160,
    render: (row) => formatFullTime(row.submitTime)
  },
  {
    title: '通过时间',
    key: 'approveTime',
    width: 160,
    render: (row) => (row.approveTime ? formatFullTime(row.approveTime) : '-')
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: getStatusType(row.status), bordered: false },
        () => getStatusText(row.status)
      )
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render(row) {
      if (row.status === 'pending') {
        return h(NSpace, { size: 4 }, {
          default: () => [
            h(
              NButton,
              {
                size: 'tiny',
                type: 'success',
                secondary: true,
                onClick: () => handleApprove(row)
              },
              { default: () => '通过' }
            ),
            h(
              NButton,
              {
                size: 'tiny',
                type: 'error',
                secondary: true,
                onClick: () => openRejectModal(row)
              },
              { default: () => '打回' }
            )
          ]
        });
      }
      return null;
    }
  }
];
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
