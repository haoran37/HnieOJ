<template>
  <div class="permission-manage">
    <n-card title="权限管理" :bordered="false">
      <!-- 顶部操作栏 -->
      <n-space class="mb-4" justify="end">
        <n-button type="primary" @click="openAddModal">
          添加权限用户
        </n-button>
        <n-button 
          type="error" 
          :disabled="selectedUserIds.length === 0"
          @click="handleBatchDelete"
        >
          批量删除权限
        </n-button>
      </n-space>

      <!-- 权限用户列表 -->
      <n-data-table
        :columns="columns"
        :data="permissionUserList"
        :loading="loading"
        :row-key="(row) => row.uid"
        @update:checked-row-keys="handleCheck"
        :scroll-x="1200"
        class="mt-4"
      />

      <!-- 分页 -->
      <div class="pagination-container">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          show-quick-jumper
          @update:page="pagination.onChange"
          @update:page-size="pagination.onChange"
        />
      </div>
    </n-card>

    <!-- 添加权限模态框 -->
    <n-modal
      v-model:show="showAddModal"
      preset="card"
      title="添加权限用户"
      style="width: 800px"
    >
      <n-space vertical size="large">
        <!-- 搜索区域 -->
        <n-input-group>
          <n-input 
            v-model:value="searchQuery" 
            placeholder="请输入UID或姓名搜索" 
            @keyup.enter="handleSearch"
          />
          <n-button type="primary" @click="handleSearch" :loading="searchLoading">
            搜索
          </n-button>
        </n-input-group>

        <!-- 搜索结果表格 -->
        <n-data-table
          :columns="searchColumns"
          :data="searchResultList"
          :loading="searchLoading"
          :row-key="(row) => row.uid"
          @update:checked-row-keys="handleSearchCheck"
          max-height="300"
        />

        <!-- 搜索分页 -->
        <div class="pagination-container">
          <n-pagination
            v-model:page="searchPagination.page"
            v-model:page-size="searchPagination.pageSize"
            :item-count="searchPagination.itemCount"
            simple
            @update:page="searchPagination.onChange"
          />
        </div>

        <!-- 权限选择 -->
        <n-form-item label="赋予权限">
          <n-select
            v-model:value="selectedPermission"
            :options="roleOptions"
            placeholder="请选择权限"
          />
        </n-form-item>

        <!-- 底部按钮 -->
        <n-space justify="end">
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button 
            type="primary" 
            :loading="submitting" 
            @click="handleAddSubmit"
            :disabled="selectedSearchUserIds.length === 0 || !selectedPermission"
          >
            确认添加
          </n-button>
        </n-space>
      </n-space>
    </n-modal>

    <!-- 编辑权限模态框 -->
    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="修改用户权限"
      style="width: 400px"
    >
      <n-form>
        <n-form-item label="用户">
          <n-input :value="`${editForm.username} (${editForm.uid})`" disabled />
        </n-form-item>
        <n-form-item label="权限">
          <n-select
            v-model:value="editForm.role"
            :options="roleOptions"
            placeholder="请选择权限"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleEditSubmit">
            确认修改
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script lang="ts" setup>
import { h } from 'vue';
import { 
  NCard, NSpace, NButton, NDataTable, NPagination, NModal, 
  NInput, NInputGroup, NSelect, NForm, NFormItem, NTag, NA 
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { usePermissionManage, type PermissionUserItem, type SearchUserItem } from '@/composables/admin/usePermissionManage';
import { UserRole } from '@/stores/userStore';

const {
  loading,
  searchLoading,
  submitting,
  showAddModal,
  showEditModal,
  searchQuery,
  searchResultList,
  searchPagination,
  selectedSearchUserIds,
  selectedPermission,
  permissionUserList,
  pagination,
  selectedUserIds,
  editForm,
  roleOptions,
  handleSearch,
  openAddModal,
  handleAddSubmit,
  openEditModal,
  handleEditSubmit,
  handleDelete,
  handleBatchDelete
} = usePermissionManage();

// 处理主表格复选
const handleCheck = (rowKeys: (string | number)[]) => {
  selectedUserIds.value = rowKeys.map(String);
};

// 处理搜索表格复选
const handleSearchCheck = (rowKeys: (string | number)[]) => {
  selectedSearchUserIds.value = rowKeys.map(String);
};

// 角色标签颜色映射
const getRoleType = (role: UserRole) => {
  switch (role) {
    case UserRole.ROOT: return 'error';
    case UserRole.ADMIN: return 'warning';
    case UserRole.TEACHER: return 'success';
    case UserRole.TA: return 'info';
    default: return 'default';
  }
};

// 主表格列定义
const columns: DataTableColumns<PermissionUserItem> = [
  { type: 'selection' },
  {
    title: 'UID',
    key: 'uid',
    width: 150,
    render(row) {
      return h(
        NA,
        {
          href: `/user/${row.uid}`, // 假设用户详情页路由
          target: '_blank',
          style: { color: '#007BFF', textDecoration: 'none' }
        },
        { default: () => row.uid }
      );
    }
  },
  { title: '姓名', key: 'username', width: 120 },
  { title: '专业班级', key: 'majorClass', width: 150 },
  { title: '学院', key: 'college', width: 200 },
  { title: '邮箱', key: 'email', width: 200 },
  { title: '手机号', key: 'phone', width: 150 },
  {
    title: '角色',
    key: 'role',
    width: 100,
    render(row) {
      return h(
        NTag,
        { type: getRoleType(row.role), bordered: false },
        { default: () => row.role }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render(row) {
      return h(NSpace, {}, {
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
            NButton,
            {
              size: 'small',
              type: 'error',
              secondary: true,
              onClick: () => handleDelete(row)
            },
            { default: () => '删除' }
          )
        ]
      });
    }
  }
];

// 搜索表格列定义
const searchColumns: DataTableColumns<SearchUserItem> = [
  { type: 'selection' },
  { title: 'UID', key: 'uid', width: 150 },
  { title: '姓名', key: 'username', width: 120 },
  { title: '专业班级', key: 'majorClass', width: 150 },
  { title: '学院', key: 'college', width: 200 },
  {
    title: '当前角色',
    key: 'role',
    width: 120,
    render(row) {
      return h(
        NTag,
        { type: getRoleType(row.role), bordered: false },
        { default: () => row.role }
      );
    }
  }
];
</script>

<style scoped lang="less">
.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

:deep(.n-data-table .n-data-table-wrapper) {
  overflow-x: auto;
}
</style>
