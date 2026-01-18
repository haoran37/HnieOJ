<template>
  <div class="achievement-manage-page">
    <n-card :bordered="false" title="成就认证审核">
      <template #header-extra>
        <n-button 
          type="success" 
          :disabled="selectedIds.length === 0"
          @click="handleBatchApprove"
        >
          <template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>
          批量通过
        </n-button>
      </template>

      <!-- 筛选区 -->
      <n-space vertical :size="16" style="margin-bottom: 16px">
        <n-space :size="12" align="center">
          <n-input
            v-model:value="filters.keyword"
            placeholder="用户名 / UID / 事项名称"
            clearable
            style="width: 240px"
          />
          <n-select
            v-model:value="filters.status"
            placeholder="状态"
            clearable
            :options="statusOptions"
            style="width: 120px"
          />
          <n-select
            v-model:value="filters.college"
            placeholder="学院"
            clearable
            :options="collegeOptions"
            style="width: 200px"
          />
          <n-button @click="resetFilters">重置</n-button>
        </n-space>
      </n-space>

      <!-- 列表 -->
      <n-data-table
        :columns="columns"
        :data="filteredList"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: AchievementApplication) => row.id"
        v-model:checked-row-keys="selectedIds"
        :scroll-x="1600"
      />
    </n-card>

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
            placeholder="请输入打回原因，将通过邮件发送给用户"
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

    <!-- 证明文件预览模态框 -->
    <n-modal
      v-model:show="showFileModal"
      preset="card"
      title="证明文件预览"
      style="width: 800px; max-width: 90vw"
    >
      <div class="file-preview">
        <img v-if="previewFileType === 'image'" :src="previewFileUrl" alt="证明文件" style="max-width: 100%" />
        <iframe v-else-if="previewFileType === 'pdf'" :src="previewFileUrl" style="width: 100%; height: 600px; border: none;"></iframe>
        <div v-else>不支持预览的文件类型</div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { 
  NButton, NTag, NSpace, NIcon, type DataTableColumns 
} from 'naive-ui';
import { 
  CheckmarkCircleOutline, 
  EyeOutline
} from '@vicons/ionicons5';
import { useRouter } from 'vue-router';
import { formatFullTime } from '@/composables/useTime';
import { useAchievementManage, type AchievementApplication } from '@/composables/admin/useAchievementManage';

const router = useRouter();

const {
  loading,
  submitting,
  selectedIds,
  showRejectModal,
  rejectReason,
  showFileModal,
  previewFileUrl,
  previewFileType,
  filters,
  pagination,
  filteredList,
  statusOptions,
  collegeOptions,
  resetFilters,
  handlePreview,
  handleApprove,
  openRejectModal,
  handleRejectSubmit,
  handleBatchApprove
} = useAchievementManage();

const columns: DataTableColumns<AchievementApplication> = [
  {
    type: 'selection',
    disabled: (row) => row.status !== 'pending'
  },
  {
    title: 'UID',
    key: 'uid',
    width: 140,
    render: (row) => h(
      'a',
      {
        style: { color: '#007BFF', cursor: 'pointer', textDecoration: 'underline' },
        onClick: () => router.push(`/user/${row.uid}`)
      },
      row.uid
    )
  },
  {
    title: '姓名',
    key: 'username',
    width: 120,
    ellipsis: { tooltip: true }
  },
  {
    title: '专业班级',
    key: 'class',
    width: 150,
    ellipsis: { tooltip: true }
  },
  {
    title: '学院',
    key: 'college',
    width: 180,
    ellipsis: { tooltip: true }
  },
  {
    title: '比赛/事项名称',
    key: 'title',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => h('span', { style: 'font-weight: 500' }, row.title)
  },
  {
    title: '证明文件',
    key: 'file',
    width: 100,
    align: 'center',
    render: (row) => h(
      NButton,
      {
        size: 'tiny',
        secondary: true,
        type: 'info',
        onClick: () => handlePreview(row)
      },
      { icon: () => h(EyeOutline), default: () => '查看' }
    )
  },
  {
    title: '详情',
    key: 'description',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.description || '-'
  },
  {
    title: '提交时间',
    key: 'submitTime',
    width: 160,
    render: (row) => formatFullTime(row.submitTime)
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const type = row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'error' : 'warning';
      const label = row.status === 'approved' ? '通过' : row.status === 'rejected' ? '打回' : '待处理';
      return h(NTag, { type, size: 'small', bordered: false }, () => label);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) => {
      if (row.status !== 'pending') return null;
      
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'tiny',
              type: 'primary',
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
  }
];
</script>

<style scoped lang="less">
.achievement-manage-page {
  :deep(.n-data-table) {
    font-size: 13px;
  }
}
</style>