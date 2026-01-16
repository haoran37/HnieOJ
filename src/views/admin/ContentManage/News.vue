<template>
  <div class="news-manage-page">
    <n-card :bordered="false" title="新闻管理">
      <template #header-extra>
        <n-button type="primary" @click="openModal('create')">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          发布新闻
        </n-button>
      </template>

      <n-data-table
        :columns="columns"
        :data="newsList"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: NewsItem) => row.id" 
      />
    </n-card>

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="modalTitle"
      class="news-modal"
      :style="{ width: '900px' }"
      :mask-closable="false"
    >
      <n-form
        label-placement="top"
        :model="formModel"
        :disabled="submitting"
      >
        <n-form-item label="新闻标题" required>
          <n-input 
            v-model:value="formModel.title" 
            placeholder="请输入引人注目的标题..." 
            size="large"
          />
        </n-form-item>

        <n-form-item label="新闻内容" required>
          <div class="editor-wrapper">
            <v-md-editor 
              v-model="formModel.content" 
              height="500px"
              placeholder="支持 Markdown 编辑..."
              :disabled="submitting"
            />
          </div>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button 
            type="primary" 
            :loading="submitting" 
            @click="handleSubmit"
          >
            {{ modalType === 'create' ? '立即发布' : '保存修改' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { 
  NButton, NSpace, NTag, type DataTableColumns 
} from 'naive-ui';
import { 
  AddOutline, CreateOutline, TrashOutline 
} from '@vicons/ionicons5';
import { useAdminNews, type NewsItem } from '@/composables/admin/useAdminNews';

const {
  loading,
  submitting,
  showModal,
  modalType,
  newsList,
  formModel,
  openModal,
  handleSubmit,
  handleDelete,
  formatFullTime
} = useAdminNews();

const modalTitle = computed(() => modalType.value === 'create' ? '发布新闻' : '编辑新闻');
const pagination = { pageSize: 10 };

const columns: DataTableColumns<NewsItem> = [
  {
    title: '序号',
    key: 'index',
    width: 80,
    render: (_, index) => index + 1
  },
  {
    title: '标题',
    key: 'title',
    width: 300,
    ellipsis: { tooltip: true },
    render: (row) => {
      return h('span', { style: 'font-weight: 500; color: #333' }, row.title)
    }
  },
  {
    title: '发布者',
    key: 'author',
    width: 120,
    render: (row) => h(NTag, { size: 'small', bordered: false }, () => row.author)
  },
  {
    title: '发布时间',
    key: 'createTime',
    width: 180,
    render: (row) => formatFullTime(row.createTime)
  },
  {
    title: '最后更新',
    key: 'updateTime',
    width: 180,
    render: (row) => formatFullTime(row.updateTime)
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'tiny',
            secondary: true,
            type: 'primary',
            onClick: () => openModal('edit', row)
          }, { icon: () => h(CreateOutline), default: () => '编辑' }),
          
          h(NButton, {
            size: 'tiny',
            secondary: true,
            type: 'error',
            onClick: () => handleDelete(row)
          }, { icon: () => h(TrashOutline), default: () => '删除' })
        ]
      });
    }
  }
];
</script>

<style scoped lang="less">
.editor-wrapper {
  width: 100%;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.v-md-editor) {
  box-shadow: none;
}
</style>