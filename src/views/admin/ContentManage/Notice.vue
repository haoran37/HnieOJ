<template>
  <div class="notice-page">
    <n-card :bordered="false" title="通知管理">
      <n-form inline label-placement="left" :show-feedback="false" class="search-bar">
        <n-form-item label="关键字">
          <n-input
            v-model:value="searchForm.keyword"
            placeholder="按标题搜索"
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
            style="width: 140px"
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="handleSearch">查询</n-button>
            <n-button @click="handleReset">重置</n-button>
            <n-button type="primary" secondary @click="openCreateModal">新建通知</n-button>
          </n-space>
        </n-form-item>
      </n-form>

      <n-alert v-if="listError" type="error" :bordered="false" style="margin-bottom: 12px">
        {{ listError }}
        <template #action>
          <n-button size="small" @click="fetchNotices">重试</n-button>
        </template>
      </n-alert>

      <n-data-table
        remote
        :columns="columns"
        :data="notices"
        :loading="listLoading"
        :row-key="(row: NoticeListVo) => row.id"
        :pagination="false"
        :scroll-x="900"
      />

      <div class="pagination-wrapper">
        <n-pagination
          :page="currentPage"
          :page-size="pageSize"
          :item-count="totalCount"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </n-card>

    <n-modal
      :show="showModal"
      preset="card"
      :title="modalTitle"
      :mask-closable="false"
      :style="{ width: 'auto', minWidth: '640px', maxWidth: '92vw' }"
      @update:show="handleModalShowChange"
    >
      <n-spin :show="detailLoading">
        <n-form label-placement="left" label-width="90">
          <n-form-item label="标题" required>
            <n-input
              v-model:value="form.title"
              :disabled="modalMode === 'view'"
              :maxlength="255"
              show-count
              placeholder="请输入通知标题"
            />
          </n-form-item>
          <n-form-item label="正文" required>
            <n-input
              v-model:value="form.content"
              type="textarea"
              :disabled="modalMode === 'view'"
              :maxlength="20000"
              :autosize="{ minRows: 4, maxRows: 12 }"
              placeholder="纯文本 / 安全 Markdown，将按纯文本展示"
            />
          </n-form-item>
          <n-form-item label="收件方式" required>
            <n-radio-group
              :value="form.targetType"
              :disabled="modalMode === 'view'"
              @update:value="handleTargetTypeChange"
            >
              <n-radio-button value="USERS">指定用户</n-radio-button>
              <n-radio-button value="CLASSES">班级</n-radio-button>
            </n-radio-group>
          </n-form-item>

          <n-form-item v-if="form.targetType === 'USERS'" label="收件用户" required>
            <n-select
              v-model:value="form.targetIds"
              multiple
              filterable
              remote
              clearable
              :disabled="modalMode === 'view'"
              :loading="userSearching"
              :options="userPickerOptions"
              :max-tag-count="6"
              placeholder="输入用户名/学号搜索并显式选择（最多 1000）"
              @search="handleUserSearch"
            />
          </n-form-item>

          <template v-else>
            <n-form-item label="学院" required>
              <n-select
                :value="selectedCollegeId"
                :options="collegeOptions"
                :disabled="modalMode === 'view'"
                placeholder="选择学院"
                clearable
                @update:value="handleCollegeChange"
              />
            </n-form-item>
            <n-form-item label="年级" required>
              <n-select
                :value="selectedGrade"
                :options="gradeOptions"
                :disabled="modalMode === 'view' || !selectedCollegeId"
                placeholder="选择年级"
                clearable
                @update:value="handleGradeChange"
              />
            </n-form-item>
            <n-form-item label="班级" required>
              <n-select
                v-model:value="form.targetIds"
                multiple
                filterable
                clearable
                :disabled="modalMode === 'view' || !selectedGrade"
                :options="classPickerOptions"
                :max-tag-count="6"
                placeholder="选择班级（可多选，最多 1000）"
              />
            </n-form-item>
          </template>

          <n-alert v-if="modalMode === 'view'" type="info" :bordered="false">
            已发布通知只读：正文与收件目标不可再编辑。
          </n-alert>
        </n-form>
      </n-spin>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="saving || publishing || detailLoading" @click="closeModal">关闭</n-button>
          <n-button
            v-if="modalMode !== 'view'"
            type="primary"
            :loading="saving"
            :disabled="saving || publishing || detailLoading"
            @click="handleSubmit"
          >
            保存草稿
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      :show="showPublishModal"
      preset="card"
      title="确认发布通知"
      :mask-closable="false"
      :style="{ width: 'auto', minWidth: '520px', maxWidth: '90vw' }"
      @update:show="handlePublishShowChange"
    >
      <n-alert type="warning" :bordered="false" style="margin-bottom: 12px">
        发布后不可撤回；已投递到用户收件箱的消息不会因删除通知管理记录而撤回。
      </n-alert>
      <template v-if="publishDetail">
        <p><strong>标题：</strong>{{ publishDetail.title }}</p>
        <p>
          <strong>收件方式：</strong>
          {{ publishDetail.targetType === 'CLASSES' ? '班级' : '指定用户' }}
        </p>
        <p><strong>收件目标（{{ publishDetail.targetIds.length }}）：</strong></p>
        <n-space size="small">
          <n-tag
            v-for="id in publishDetail.targetIds"
            :key="id"
            size="small"
            :bordered="false"
          >
            {{ id }}
          </n-tag>
        </n-space>
      </template>
      <n-spin v-else :show="true" style="min-height: 60px" />
      <template #footer>
        <n-space justify="end">
          <n-button :disabled="publishing" @click="closePublishModal">取消</n-button>
          <n-button
            type="primary"
            :loading="publishing"
            :disabled="publishing || !publishDetail"
            @click="confirmPublish"
          >
            确认发布
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted } from 'vue';
import { NButton, NSpace, NTag, useDialog, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { useNotice } from '@/composables/admin/useNotice';
import type { NoticeListVo } from '@/utils/api';

const dialog = useDialog();

const {
  listLoading,
  detailLoading,
  saving,
  publishing,
  deleting,
  listError,
  notices,
  totalCount,
  currentPage,
  pageSize,
  searchForm,
  showModal,
  modalMode,
  form,
  fetchNotices,
  handleSearch,
  handleReset,
  handlePageChange,
  handlePageSizeChange,
  openCreateModal,
  openDetailModal,
  closeModal,
  handleModalShowChange,
  collegeOptions,
  gradeOptions,
  selectedCollegeId,
  selectedGrade,
  userSearching,
  userPickerOptions,
  classPickerOptions,
  loadColleges,
  handleUserSearch,
  handleCollegeChange,
  handleGradeChange,
  handleTargetTypeChange,
  handleSubmit,
  showPublishModal,
  publishDetail,
  openPublishConfirm,
  closePublishModal,
  handlePublishShowChange,
  confirmPublish,
  handleDelete,
} = useNotice();

const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
];

const modalTitle = computed(() => {
  if (modalMode.value === 'view') return '通知详情';
  return modalMode.value === 'create' ? '新建通知草稿' : '编辑通知草稿';
});

const statusText = (status: string | null) => (status === 'PUBLISHED' ? '已发布' : '草稿');

const handleDeleteConfirm = (row: NoticeListVo) => {
  dialog.warning({
    title: '删除通知管理记录',
    content: '只删除通知管理记录，不会撤回已投递到用户收件箱的消息。确认删除？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => handleDelete(row),
  });
};

const columns: DataTableColumns<NoticeListVo> = [
  { title: '标题', key: 'title', minWidth: 200, className: 'cell-wrap' },
  {
    title: '目标类型',
    key: 'targetType',
    width: 110,
    render: (row) => (row.targetType === 'CLASSES' ? '班级' : '指定用户'),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(
        NTag,
        {
          size: 'small',
          type: row.status === 'PUBLISHED' ? 'success' : 'warning',
          bordered: false,
        },
        () => statusText(row.status),
      ),
  },
  {
    title: '发布时间',
    key: 'publishedAt',
    width: 170,
    render: (row) => (row.publishedAt ? formatFullTime(row.publishedAt) : '-'),
  },
  {
    title: '创建时间',
    key: 'gmtCreate',
    width: 170,
    render: (row) => formatFullTime(row.gmtCreate),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 4 }, {
        default: () => {
          const buttons = [
            h(
              NButton,
              {
                size: 'tiny',
                secondary: true,
                onClick: () => void openDetailModal(row),
              },
              { default: () => (row.status === 'PUBLISHED' ? '查看' : '编辑') },
            ),
          ];
          if (row.status !== 'PUBLISHED') {
            buttons.push(
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'primary',
                  secondary: true,
                  disabled: publishing.value,
                  onClick: () => void openPublishConfirm(row),
                },
                { default: () => '发布' },
              ),
            );
          }
          buttons.push(
            h(
              NButton,
              {
                size: 'tiny',
                type: 'error',
                secondary: true,
                disabled: deleting.value,
                onClick: () => handleDeleteConfirm(row),
              },
              { default: () => '删除' },
            ),
          );
          return buttons;
        },
      }),
  },
];

onMounted(() => {
  void fetchNotices();
  void loadColleges();
});
</script>

<style scoped lang="less">
.notice-page {
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
</style>
