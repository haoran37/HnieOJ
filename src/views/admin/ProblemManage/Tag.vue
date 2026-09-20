<template>
  <div class="tag-manage-container">
    <n-card title="标签管理" :bordered="false" class="main-card">
      <template #header-extra>
        <n-button type="primary" :disabled="saving" @click="openCreateModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新建标签
        </n-button>
      </template>

      <n-alert v-if="error" type="error" :bordered="false" class="tip">
        {{ error }}
        <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="fetchTags">
          重试
        </n-button>
      </n-alert>

      <n-data-table
        :columns="columns"
        :data="tags"
        :loading="loading"
        :row-key="(row: TagVo) => row.id"
        :pagination="pagination"
        size="small"
        :bordered="false"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
      <div v-if="!loading && !error && tags.length === 0" class="tip empty-tip">
        标签目录为空，可点击右上角「新建标签」创建。
      </div>
    </n-card>

    <n-modal
      :show="showModal"
      @update:show="handleModalShowChange"
      preset="card"
      :title="modalMode === 'create' ? '新建标签' : '编辑标签'"
      style="width: 480px"
      :mask-closable="false"
    >
      <n-form :model="formModel" label-placement="left" label-width="80">
        <n-form-item label="名称" required>
          <n-input
            v-model:value="formModel.name"
            :maxlength="TAG_NAME_MAX"
            show-count
            placeholder="请输入标签名称"
            :disabled="saving"
          />
        </n-form-item>
        <n-form-item label="颜色">
          <n-input
            v-model:value="formModel.color"
            :maxlength="TAG_COLOR_MAX"
            placeholder="如 #409EFF，可留空"
            :disabled="saving"
          />
        </n-form-item>
        <n-form-item label="分类">
          <n-input
            v-model:value="formModel.category"
            :maxlength="TAG_CATEGORY_MAX"
            placeholder="如 算法，可留空"
            :disabled="saving"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="saving" @click="closeModal">取消</n-button>
          <n-button type="primary" :loading="saving" :disabled="saving" @click="handleSubmit">
            提交
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script lang="ts" setup>
import { h, onMounted } from 'vue';
import { NButton, NPopconfirm, NSpace, NTag, type DataTableColumns } from 'naive-ui';
import { AddOutline } from '@vicons/ionicons5';
import {
  useTagManage,
  TAG_NAME_MAX,
  TAG_COLOR_MAX,
  TAG_CATEGORY_MAX,
} from '@/composables/admin/useTagManage';
import type { TagVo } from '@/utils/api';

const {
  loading,
  saving,
  error,
  tags,
  showModal,
  modalMode,
  formModel,
  pagination,
  fetchTags,
  openCreateModal,
  openEditModal,
  closeModal,
  handleModalShowChange,
  handleSubmit,
  handleDelete,
  handlePageChange,
  handlePageSizeChange,
} = useTagManage();

const columns: DataTableColumns<TagVo> = [
  { title: '名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  {
    title: '颜色',
    key: 'color',
    width: 160,
    render(row: TagVo) {
      if (!row.color) return h('span', { class: 'muted' }, '—');
      return h(
        NTag,
        { bordered: false, size: 'small', color: { color: row.color, textColor: '#fff' } },
        { default: () => row.color },
      );
    },
  },
  {
    title: '分类',
    key: 'category',
    width: 160,
    render: (row: TagVo) => (row.category ? row.category : h('span', { class: 'muted' }, '未分类')),
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render(row: TagVo) {
      return h(NSpace, { align: 'center' }, {
        default: () => [
          h(NButton, { size: 'tiny', secondary: true, type: 'primary', disabled: saving.value, onClick: () => openEditModal(row) },
            { default: () => '编辑' }),
          h(NPopconfirm, { onPositiveClick: () => handleDelete(row) }, {
            trigger: () => h(NButton, { size: 'tiny', secondary: true, type: 'error' },
              { default: () => '删除' }),
            default: () => '确定删除该标签吗？被题目引用的标签需先解除关联。',
          }),
        ],
      });
    },
  },
];

onMounted(() => {
  void fetchTags();
});
</script>

<style scoped lang="less">
.tag-manage-container {
  height: 100%;

  .main-card {
    height: 100%;
  }
}

.tip {
  margin-bottom: 16px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 24px 0 8px;
}

.muted {
  color: #999;
}
</style>
