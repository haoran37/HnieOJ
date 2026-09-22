<template>
  <div class="registration-page">
    <n-card :bordered="false" title="注册审核">
      <template #header-extra>
        <n-space>
          <n-button type="primary" :disabled="submitting" @click="openImportModal">
            <template #icon>
              <n-icon :size="18"><CloudUploadOutline /></n-icon>
            </template>
            上传名单自动通过
          </n-button>
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

    <!-- 导入注册名单模态框（真实上传 POST /api/registrations/import，每行注册后自动通过） -->
    <n-modal
      v-model:show="showImportModal"
      preset="card"
      title="上传名单自动通过"
      :mask-closable="false"
      :closable="!submitting"
      :close-on-esc="!submitting"
      style="width: auto; min-width: 640px; max-width: 90vw"
      @after-leave="handleImportModalAfterLeave"
    >
      <n-space vertical :size="16">
        <n-alert type="info" :show-icon="false">
          支持 .xls / .xlsx 单文件；表头必须为 uid、username、password、email、collegeId、classId、grade、qq（列顺序不限），单次最多 1000 行数据。
          名单中每一行都会注册新账号并自动通过审核（不是审批已有 UID），请勿重复上传同一份名单。
        </n-alert>

        <n-upload
          :max="1"
          accept=".xlsx,.xls"
          :default-upload="false"
          :disabled="submitting"
          :file-list="importFileList"
          @change="handleImportUploadChange"
        >
          <n-button :disabled="submitting">选择文件</n-button>
        </n-upload>

        <template v-if="importResult">
          <n-alert :type="importResultType">
            成功 {{ importResult.successCount }} 条，失败 {{ importResult.failedCount }} 条。
            <template v-if="importResult.failedCount > 0">
              请只修正失败行后再上传（成功行不要重复导入）。
            </template>
          </n-alert>

          <n-space v-if="importResult.successUids.length > 0" vertical :size="8">
            <n-text strong>已通过 UID</n-text>
            <n-list bordered>
              <n-list-item v-for="uid in importResult.successUids" :key="uid">{{ uid }}</n-list-item>
            </n-list>
          </n-space>

          <n-space v-if="importResult.failures.length > 0" vertical :size="8">
            <n-text strong>失败行（UID 与原因）</n-text>
            <n-list bordered>
              <n-list-item
                v-for="(failure, index) in importResult.failures"
                :key="`${failure.rowNo}-${failure.uid}-${index}`"
              >
                第 {{ failure.rowNo ?? '-' }} 行 · UID {{ failure.uid || '（空）' }}：{{
                  failure.reason || '导入失败'
                }}
              </n-list-item>
            </n-list>
          </n-space>
        </template>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button :disabled="submitting" @click="closeImportModal">关闭</n-button>
          <n-button type="primary" :loading="submitting" @click="handleImport">导入</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted } from 'vue';
import {
  NButton,
  NSpace,
  NTag,
  NIcon,
  type DataTableColumns,
  type UploadFileInfo,
  type UploadOnChange,
} from 'naive-ui';
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
  showImportModal,
  importFile,
  importResult,
  fetchRegistrations,
  resetFilters,
  handleApprove,
  openRejectModal,
  handleRejectSubmit,
  handleBatchApprove,
  openImportModal,
  closeImportModal,
  handleImportModalAfterLeave,
  handleImportFileChange,
  handleImport,
  formatFullTime,
} = useRegistration();

// 上传组件展示的受控列表始终来自 composable 中唯一一份待导入文件：
// 校验被拒、导入完成、关闭弹窗后都不会残留旧文件误导重复导入
const importFileList = computed<UploadFileInfo[]>(() => {
  const file = importFile.value;
  if (!file) return [];
  return [{ id: 'registration-import-file', name: file.name, status: 'pending', file }];
});

const handleImportUploadChange: UploadOnChange = ({ fileList }) => {
  handleImportFileChange(fileList[fileList.length - 1]?.file ?? null);
};

const importResultType = computed(() => {
  if (!importResult.value || importResult.value.failedCount === 0) return 'success';
  return importResult.value.successCount > 0 ? 'warning' : 'error';
});

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
