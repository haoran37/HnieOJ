<template>
  <div class="discuss-manage-container">
    <n-card :bordered="false">
      <div class="header">
        <div class="title">讨论列表</div>
      </div>
      
      <n-space vertical :size="16">
        <div class="search-bar">
          <n-input-group>
            <n-input v-model:value="searchForm.keyword" placeholder="搜索标题或发布者..." @keyup.enter="handleSearch" />
            <n-button type="primary" @click="handleSearch">
              搜索
            </n-button>
          </n-input-group>
        </div>

        <n-data-table
          :columns="columns"
          :data="discussList"
          :loading="loading"
          :pagination="pagination"
          :scroll-x="1000"
          striped
        />
      </n-space>
    </n-card>

    <!-- 编辑模态框 -->
    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑讨论"
      style="width: 800px"
      :bordered="false"
      size="huge"
    >
      <n-form
        label-placement="left"
        label-width="80"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="标题">
          <n-input v-model:value="editForm.title" placeholder="请输入标题" />
        </n-form-item>
        
        <n-form-item label="状态">
          <n-select 
            v-model:value="editForm.status" 
            :options="statusOptions"
            placeholder="选择状态" 
          />
        </n-form-item>

        <n-form-item label="所属板块">
          <n-select 
            v-model:value="editForm.category" 
            :options="categoryOptions"
            placeholder="选择板块" 
          />
        </n-form-item>

        <n-form-item label="标签">
          <n-dynamic-tags v-model:value="editForm.tags" />
        </n-form-item>

        <n-form-item label="内容">
          <div style="width: 100%">
            <v-md-editor 
              v-model="editForm.content" 
              height="400px"
              placeholder="编辑内容..."
            ></v-md-editor>
          </div>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="editLoading" @click="handleSaveEdit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { NButton, NTag, NSpace, NIcon, NPopconfirm, NCard, NInput, NInputGroup, NDataTable, NModal, NForm, NFormItem, NSelect, NDynamicTags } from 'naive-ui';
import { useDiscussManage, type DiscussItem } from '@/composables/admin/useDiscussManage';

const {
  loading,
  discussList,
  pagination,
  searchForm,
  handleSearch,
  
  showEditModal,
  editLoading,
  editForm,
  openEditModal,
  handleSaveEdit,
  
  handleDelete
} = useDiscussManage();

const statusOptions = [
  { label: '正常', value: 'Normal' },
  { label: '置顶', value: 'Top' },
  { label: '封存', value: 'Closed' }
];

const categoryOptions = [
  { label: '站内事务', value: 'Site' },
  { label: '题目讨论', value: 'Problem' }
];

const columns = [
  { 
    title: '编号', 
    key: 'id', 
    width: 80,
    align: 'center' as const
  },
  { 
    title: '标题', 
    key: 'title',
    render(row: DiscussItem) {
      return h(
        'a',
        {
          href: `/discuss/${row.id}`,
          target: '_blank',
          style: {
            textDecoration: 'none',
            color: '#2080f0',
            fontWeight: '500',
            cursor: 'pointer'
          }
        },
        { default: () => row.title }
      );
    }
  },
  { 
    title: '发布者', 
    key: 'author',
    width: 150
  },
  { 
    title: '所属板块', 
    key: 'category',
    width: 120,
    render(row: DiscussItem) {
      const isSite = row.category === 'Site';
      return h(
        NTag,
        { type: isSite ? 'warning' : 'info', bordered: false, size: 'small' },
        { default: () => isSite ? '站内事务' : '题目讨论' }
      );
    }
  },
  { 
    title: '发布时间', 
    key: 'createTime',
    width: 180
  },
  { 
    title: '状态', 
    key: 'status',
    width: 100,
    render(row: DiscussItem) {
      let type: 'default' | 'success' | 'warning' | 'error' = 'default';
      let label = '正常';
      
      switch (row.status) {
        case 'Top': type = 'warning'; label = '置顶'; break;
        case 'Normal': type = 'success'; label = '正常'; break;
        case 'Closed': type = 'error'; label = '封存'; break;
      }
      
      return h(NTag, { type, bordered: false, size: 'small' }, { default: () => label });
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right' as const,
    render(row: DiscussItem) {
      return h(
        NSpace,
        { size: 'small' },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                secondary: true,
                onClick: () => openEditModal(row)
              },
              { default: () => '编辑' }
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row),
                positiveText: '确定',
                negativeText: '取消'
              },
              {
                trigger: () => h(
                  NButton,
                  {
                    size: 'small',
                    type: 'error',
                    secondary: true
                  },
                  { default: () => '删除' }
                ),
                default: () => '确定要删除该讨论吗？'
              }
            )
          ]
        }
      );
    }
  }
];
</script>

<style scoped lang="less">
.discuss-manage-container {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .title {
      font-size: 18px;
      font-weight: bold;
    }
  }

  .search-bar {
    width: 300px;
  }
}
</style>
