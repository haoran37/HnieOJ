<template>
  <div class="change-page">
    <n-card :bordered="false" title="信息修改审核">
      <template #header-extra>
        <n-space>
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
        :row-key="(row: ChangeItem) => row.uid"
        v-model:checked-row-keys="selectedIds"
        :scroll-x="1400"
        :row-props="handleRowProps"
      />

      <div class="pagination-wrapper">
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="totalCount"
          show-size-picker
          :page-sizes="[10, 15, 20, 30, 50]"
        />
      </div>
    </n-card>

    <n-modal
      v-model:show="showRejectModal"
      preset="card"
      title="打回申请"
      :mask-closable="false"
      :style="{
        width: 'auto',
        minWidth: '600px',
        maxWidth: '90vw'
      }"
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
import { NButton, NSpace, NTag, NIcon, type DataTableColumns } from 'naive-ui';
import { CheckmarkDoneOutline } from '@vicons/ionicons5';
import { useUserChange, type ChangeItem } from '@/composables/admin/useUserChange';

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
  formatFullTime
} = useUserChange();

// 状态标签映射逻辑 
const getStatusType = (status: string) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
};

const getStatusText = (status: string) => {
  if (status === 'approved') return '通过';
  if (status === 'rejected') return '打回';
  return '待处理';
};

// 渲染内容详情 
const renderContent = (content: Record<string, string | undefined>) => {
  const fields = { name: '姓名', uid: 'UID', college: '学院', class: '班级' };
  const items = Object.entries(content)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${fields[key as keyof typeof fields]}: ${value}`);
  return items.join('\n');
};

/**
 * 【重点修改】行属性设置
 * 移除了非待处理行的 cursor: not-allowed，仅保留透明度区分 
 */
const handleRowProps = (row: ChangeItem) => {
  return {
    style: row.status !== 'pending' ? 'opacity: 0.7;' : 'cursor: pointer;'
  };
};

const columns: DataTableColumns<ChangeItem> = [
  { 
    type: 'selection',
    // 只有待处理状态允许勾选 
    disabled(row: ChangeItem) {
      return row.status !== 'pending';
    }
  },
  {
    title: 'UID',
    key: 'uid',
    width: 130,
    render: (row) =>
      h(
        'a',
        {
          href: `/user/${row.uid}`,
          class: 'uid-link',
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            window.open(`/user/${row.uid}`, '_blank');
          }
        },
        row.uid
      )
  },
  {
    title: '姓名',
    key: 'name',
    width: 100,
    ellipsis: { tooltip: true }
  },
  {
    title: '原因',
    key: 'reason',
    width: 140,
    ellipsis: { tooltip: true }
  },
  {
    title: '原先内容',
    key: 'originalContent',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => renderContent(row.originalContent)
  },
  {
    title: '修改内容',
    key: 'modifiedContent',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => renderContent(row.modifiedContent)
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
      return h('span', { style: 'color: #999; font-size: 12px;' }, '已处理');
    }
  }
];
</script>

<style scoped lang="less">
.change-page {
  :deep(.n-data-table) {
    font-size: 13px;

    .n-data-table-wrapper {
      overflow-x: auto;
      
      &::-webkit-scrollbar {
        height: 8px;
      }
      
      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
        
        &:hover {
          background: #555;
        }
      }
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  :deep(.uid-link) {
    color: #007BFF;
    text-decoration: none;
    cursor: pointer;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
      color: #0056b3;
    }
  }
}
</style>