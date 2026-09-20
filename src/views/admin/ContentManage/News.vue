<template>
  <div class="news-manage-page">
    <n-card :bordered="false" title="新闻管理">
      <template #header-extra>
        <n-button type="primary" :disabled="saving" @click="openCreateModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新建新闻
        </n-button>
      </template>

      <n-space vertical :size="16">
        <n-alert v-if="error" type="error" :bordered="false">
          {{ error }}
          <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="fetchAnnouncements">
            重试
          </n-button>
        </n-alert>

        <n-space>
          <n-input
            v-model:value="searchForm.keyword"
            placeholder="搜索新闻标题"
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
          <n-select
            v-model:value="searchForm.status"
            :options="statusFilterOptions"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          />
          <n-button type="primary" @click="handleSearch">搜索</n-button>
          <n-button @click="handleReset">重置</n-button>
        </n-space>

        <n-data-table
          remote
          :columns="columns"
          :data="announcements"
          :pagination="pagination"
          :loading="loading"
          :row-key="(row: GeneralAnnouncement) => row.id"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </n-space>
    </n-card>

    <n-modal
      :show="showModal"
      @update:show="handleModalShowChange"
      preset="card"
      :title="modalMode === 'create' ? '新建新闻' : '编辑新闻'"
      style="width: 700px"
      :mask-closable="false"
    >
      <n-form :model="formModel" label-placement="left" label-width="80">
        <n-form-item label="标题" required>
          <n-input v-model:value="formModel.title" placeholder="请输入新闻标题" :disabled="saving" />
        </n-form-item>

        <n-form-item label="状态" required>
          <n-radio-group v-model:value="formModel.status" :disabled="saving">
            <n-radio-button :value="1">上线</n-radio-button>
            <n-radio-button :value="0">下线</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="内容" required>
          <div style="width: 100%">
            <v-md-editor
              v-model="formModel.content"
              height="360px"
              placeholder="支持 Markdown..."
              :disabled="saving"
            ></v-md-editor>
          </div>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="saving" @click="closeModal">取消</n-button>
          <n-button type="primary" :loading="saving" :disabled="saving" @click="handleSubmit">提交</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { NTag, NButton, NSpace, NPopconfirm, type DataTableColumns } from 'naive-ui';
import { useAdminNews, type GeneralAnnouncement } from '@/composables/admin/useAdminNews';
import { formatFullTime } from '@/composables/useTime';
import { AddOutline } from '@vicons/ionicons5';

const {
  loading,
  saving,
  error,
  showModal,
  modalMode,
  announcements,
  pagination,
  searchForm,
  formModel,
  fetchAnnouncements,
  handleSearch,
  handleReset,
  handlePageChange,
  handlePageSizeChange,
  openCreateModal,
  openEditModal,
  closeModal,
  handleModalShowChange,
  handleSubmit,
  handleDelete,
  toggleStatus,
} = useAdminNews();

const statusFilterOptions = [
  { label: '已上线', value: 1 },
  { label: '已下线', value: 0 },
];

const columns: DataTableColumns<GeneralAnnouncement> = [
  { title: '编号', key: 'id', width: 80, align: 'center' },
  { title: '标题', key: 'title', minWidth: 240, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      const online = row.status === 1;
      return h(
        NTag,
        { type: online ? 'success' : 'default', bordered: false, size: 'small' },
        () => (online ? '已上线' : '已下线')
      );
    }
  },
  {
    title: '创建时间',
    key: 'gmtCreate',
    width: 180,
    render: (row) => formatFullTime(row.gmtCreate)
  },
  {
    title: '更新时间',
    key: 'gmtModified',
    width: 180,
    render: (row) => formatFullTime(row.gmtModified)
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right',
    render(row) {
      const online = row.status === 1;
      return h(NSpace, { align: 'center' }, {
        default: () => [
          h(NButton, {
            size: 'tiny',
            secondary: true,
            type: online ? 'warning' : 'success',
            onClick: () => toggleStatus(row)
          }, { default: () => (online ? '下线' : '上线') }),
          h(NButton, {
            size: 'tiny',
            secondary: true,
            type: 'primary',
            disabled: saving.value,
            onClick: () => openEditModal(row)
          }, { default: () => '编辑' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row)
          }, {
            trigger: () => h(NButton, { size: 'tiny', secondary: true, type: 'error' }, { default: () => '删除' }),
            default: () => '确定删除该新闻吗？'
          })
        ]
      });
    }
  }
];
</script>

<style scoped lang="less">
.news-manage-page {
  :deep(.n-card) {
    width: 100%;
  }
}
</style>
