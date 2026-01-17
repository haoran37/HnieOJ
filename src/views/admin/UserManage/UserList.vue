<template>
  <div class="user-list-page">
    <n-card :bordered="false" title="用户管理">
      <template #header-extra>
        <n-space>
          <n-button type="primary" @click="openAddUserModal">
            <template #icon><n-icon><PersonAddOutline /></n-icon></template>
            添加
          </n-button>
          <n-button type="info" @click="showImportModal = true">
            <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
            导入
          </n-button>
          <n-button 
            type="success" 
            :disabled="selectedUserIds.length === 0"
            @click="handleBatchEnable"
          >
            批量激活
          </n-button>
          <n-button 
            type="warning" 
            :disabled="selectedUserIds.length === 0"
            @click="handleBatchDisable"
          >
            批量禁用
          </n-button>
          <n-button 
            type="error" 
            :disabled="selectedUserIds.length === 0"
            @click="handleBatchDelete"
          >
            批量删除
          </n-button>
        </n-space>
      </template>

      <!-- 筛选区 -->
      <n-space vertical :size="16" style="margin-bottom: 16px">
        <n-space :size="12" align="center">
          <n-input
            v-model:value="filters.keyword"
            placeholder="用户名 / UID"
            clearable
            style="width: 200px"
          />
          <n-input
            v-model:value="filters.email"
            placeholder="邮箱"
            clearable
            style="width: 200px"
          />
          <n-select
            v-model:value="filters.role"
            placeholder="角色"
            clearable
            :options="roleOptions"
            style="width: 150px"
          />
          <n-select
            v-model:value="filters.status"
            placeholder="状态"
            clearable
            :options="statusOptions"
            style="width: 120px"
          />
          <n-date-picker
            v-model:value="filters.registerTimeRange"
            type="daterange"
            clearable
            placeholder="注册时间范围"
            style="width: 280px"
          />
          <n-button @click="resetFilters">重置</n-button>
        </n-space>

        <n-space :size="12" align="center">
          <n-select
            v-model:value="filters.college"
            placeholder="学院"
            clearable
            filterable
            :options="collegeOptions"
            style="width: 200px"
            @update:value="handleCollegeChange"
          />
          <n-select
            v-model:value="filters.grade"
            placeholder="年级"
            clearable
            filterable
            :options="gradeOptions"
            :disabled="!filters.college"
            style="width: 120px"
            @update:value="handleGradeChange"
          />
          <n-select
            v-model:value="filters.class"
            placeholder="班级"
            clearable
            filterable
            :options="classOptions"
            :disabled="!filters.grade"
            style="width: 150px"
          />
        </n-space>
      </n-space>

      <!-- 用户列表 -->
      <n-data-table
        :columns="columns"
        :data="filteredUserList"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: UserItem) => row.uid"
        v-model:checked-row-keys="selectedUserIds"
        :scroll-x="1500"
      />
    </n-card>

    <!-- 编辑用户模态框 -->
    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑用户"
      :mask-closable="false"
      style="width: auto; min-width: 600px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="80" :disabled="submitting">
        <n-form-item label="UID" required>
          <n-input v-model:value="editForm.uid" placeholder="请输入UID" />
        </n-form-item>
        <n-form-item label="用户名" required>
          <n-input v-model:value="editForm.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="邮箱" required>
          <n-input v-model:value="editForm.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="editForm.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="学院">
          <n-select 
            v-model:value="editForm.college" 
            :options="collegeOptions"
            filterable
            clearable
            @update:value="handleEditCollegeChange"
          />
        </n-form-item>
        <n-form-item label="年级">
          <n-select 
            v-model:value="editForm.grade" 
            :options="gradeOptions"
            filterable
            clearable
            :disabled="!editForm.college"
            @update:value="handleEditGradeChange"
          />
        </n-form-item>
        <n-form-item label="班级">
          <n-select 
            v-model:value="editForm.class" 
            :options="classOptions"
            filterable
            clearable
            :disabled="!editForm.grade"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleEditSubmit">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 添加用户模态框 -->
    <n-modal
      v-model:show="showAddUserModal"
      preset="card"
      title="添加用户"
      :mask-closable="false"
      style="width: auto; min-width: 600px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="80" :disabled="submitting">
        <n-form-item label="UID" required>
          <n-input v-model:value="addUserForm.uid" placeholder="请输入UID" />
        </n-form-item>
        <n-form-item label="用户名" required>
          <n-input v-model:value="addUserForm.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="邮箱" required>
          <n-input v-model:value="addUserForm.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item label="学院">
          <n-select 
            v-model:value="addUserForm.college" 
            :options="collegeOptions"
            filterable
            clearable
            @update:value="handleAddCollegeChange"
          />
        </n-form-item>
        <n-form-item label="年级">
          <n-select 
            v-model:value="addUserForm.grade" 
            :options="gradeOptions"
            filterable
            clearable
            :disabled="!addUserForm.college"
            @update:value="handleAddGradeChange"
          />
        </n-form-item>
        <n-form-item label="班级">
          <n-select 
            v-model:value="addUserForm.class" 
            :options="classOptions"
            filterable
            clearable
            :disabled="!addUserForm.grade"
          />
        </n-form-item>
        <n-alert type="info" style="margin-top: 8px">
          默认角色为学生，状态为激活
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddUserModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleAddUser">
            添加
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 修改密码模态框 -->
    <n-modal
      v-model:show="showPasswordModal"
      preset="card"
      title="修改密码"
      :mask-closable="false"
      style="width: auto; min-width: 400px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="80" :disabled="submitting">
        <n-form-item label="用户">
          <n-input :value="`${passwordForm.username} (${passwordForm.uid})`" disabled />
        </n-form-item>
        <n-form-item label="新密码" required>
          <n-input
            v-model:value="passwordForm.newPassword"
            type="password"
            show-password-on="click"
            placeholder="请输入新密码（至少6位）"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPasswordModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handlePasswordSubmit">
            确定
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 转移源码模态框 -->
    <n-modal
      v-model:show="showTransferModal"
      preset="card"
      title="转移源码"
      :mask-closable="false"
      style="width: auto; min-width: 500px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="120" :disabled="submitting">
        <n-form-item label="当前用户">
          <n-input :value="`${transferForm.sourceUsername} (${transferForm.sourceUid})`" disabled />
        </n-form-item>
        <n-form-item label="目标用户" required>
          <n-select
            v-model:value="transferForm.targetUid"
            placeholder="请选择目标用户"
            :options="targetUserOptions"
            filterable
          />
        </n-form-item>
        <n-form-item label="删除原用户源码">
          <n-checkbox v-model:checked="transferForm.deleteOriginal">
            转移后删除原用户的源码
          </n-checkbox>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTransferModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleTransferSubmit">
            确定转移
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 成就管理模态框 -->
    <n-modal
      v-model:show="showAchievementModal"
      preset="card"
      title="成就管理"
      style="width: auto; min-width: 600px; max-width: 90vw" 
      :mask-closable="false"
    >
      <n-space vertical :size="16">
        <n-alert type="info" :show-icon="false">
          用户：{{ achievementForm.username }} ({{ achievementForm.uid }})
        </n-alert>

        <n-divider style="margin: 0">已有成就</n-divider>
        
        <n-scrollbar style="min-height: 180px; max-height: 180px; padding-right: 10px;">
          <n-list v-if="achievementForm.achievements.length > 0" bordered>
            <n-list-item v-for="ach in achievementForm.achievements" :key="ach.id">
              <template #suffix>
                <n-button
                  size="small"
                  type="error"
                  secondary
                  @click="handleDeleteAchievement(ach.id)"
                >
                  删除
                </n-button>
              </template>
              <n-space vertical :size="4">
                <n-text strong>{{ ach.content }}</n-text>
                <n-text depth="3" style="font-size: 12px">
                  {{ formatFullTime(ach.date) }}
                </n-text>
              </n-space>
            </n-list-item>
          </n-list>
          <n-empty v-else description="暂无成就" />
        </n-scrollbar>

        <n-divider style="margin: 0">添加新成就</n-divider>

        <n-form label-placement="left" :label-width="80">
          <n-form-item label="成就内容" required>
            <n-input
              v-model:value="achievementForm.newContent"
              placeholder="请输入成就内容"
              type="textarea"
              :rows="2"
            />
          </n-form-item>
          <n-form-item label="获得时间">
            <n-date-picker
              v-model:value="achievementForm.newDate"
              type="date"
              style="width: 100%"
            />
          </n-form-item>
          <n-form-item :show-label="false">
            <n-button type="primary" @click="handleAddAchievement">
              添加成就
            </n-button>
          </n-form-item>
        </n-form>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAchievementModal = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- IP 限制模态框 -->
    <n-modal
      v-model:show="showIpModal"
      preset="card"
      title="指定登录 IP"
      :mask-closable="false"
      style="width: auto; min-width: 500px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="100" :disabled="submitting">
        <n-form-item label="用户">
          <n-input :value="`${ipForm.username} (${ipForm.uid})`" disabled />
        </n-form-item>
        <n-form-item label="是否限制 IP">
          <n-switch v-model:value="ipForm.ipRestricted" />
        </n-form-item>
        <n-form-item label="IP 白名单" v-if="ipForm.ipRestricted">
          <n-input
            v-model:value="ipForm.ipWhitelist"
            type="textarea"
            placeholder="每行一个 IP 地址或 CIDR 表示法&#10;例如：&#10;192.168.1.100&#10;10.0.0.0/24"
            :rows="6"
          />
        </n-form-item>
        <n-alert type="info" v-if="ipForm.ipRestricted" style="margin-top: 8px">
          支持单个 IP 地址或 CIDR 表示法（如 192.168.1.0/24）
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showIpModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleIpSubmit">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 导入用户模态框 -->
    <n-modal
      v-model:show="showImportModal"
      preset="card"
      title="导入用户"
      :mask-closable="false"
      style="width: auto; min-width: 600px; max-width: 90vw"
    >
      <n-space vertical :size="16">
        <n-alert type="info">
          请上传 Excel 文件导入用户，默认角色为学生，状态为激活
        </n-alert>

        <n-upload
          :max="1"
          accept=".xlsx,.xls"
          :default-upload="false"
          @change="handleFileChange"
        >
          <n-button>选择文件</n-button>
        </n-upload>

        <n-space>
          <n-button text type="primary" @click="handleDownloadTemplate">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            下载模板
          </n-button>
        </n-space>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showImportModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleImport">
            导入
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted } from 'vue';
import { NButton, NSpace, NTag, NDropdown, NIcon, type DataTableColumns, type UploadFileInfo } from 'naive-ui';
import {
  PersonAddOutline,
  CloudUploadOutline,
  CreateOutline,
  KeyOutline,
  SwapHorizontalOutline,
  TrophyOutline,
  LockClosedOutline,
  TrashOutline,
  EllipsisHorizontalOutline,
  DownloadOutline
} from '@vicons/ionicons5';
import { useUserManage, type UserItem } from '@/composables/admin/useUserManage';
import { UserRole } from '@/stores/userStore';

const {
  loading,
  submitting,
  filteredUserList,
  selectedUserIds,
  filters,
  showEditModal,
  showPasswordModal,
  showTransferModal,
  showAchievementModal,
  showIpModal,
  showAddUserModal,
  showImportModal,
  editForm,
  passwordForm,
  transferForm,
  achievementForm,
  ipForm,
  addUserForm,
  importForm,
  userList,
  collegeOptions,
  gradeOptions,
  classOptions,
  fetchColleges,
  fetchGradesByCollege,
  fetchClassesByCollegeAndGrade,
  openEditModal,
  handleEditSubmit,
  openPasswordModal,
  handlePasswordSubmit,
  openTransferModal,
  handleTransferSubmit,
  openAchievementModal,
  handleAddAchievement,
  handleDeleteAchievement,
  openIpModal,
  handleIpSubmit,
  handleDelete,
  handleBatchDisable,
  handleBatchEnable,
  handleBatchDelete,
  openAddUserModal,
  handleAddUser,
  handleImport,
  handleDownloadTemplate,
  resetFilters,
  formatFullTime
} = useUserManage();

const pagination = { pageSize: 15 };

const roleOptions = [
  { label: '学生', value: UserRole.STUDENT },
  { label: '助教', value: UserRole.TA },
  { label: '教师', value: UserRole.TEACHER },
  { label: '管理员', value: UserRole.ADMIN },
  { label: '超级管理员', value: UserRole.ROOT }
];

const statusOptions = [
  { label: '正常', value: 'normal' },
  { label: '禁用', value: 'disabled' }
];

const targetUserOptions = computed(() => {
  return userList.value
    .filter(u => u.uid !== transferForm.sourceUid)
    .map(u => ({
      label: `${u.username} (${u.uid})`,
      value: u.uid
    }));
});

const getRoleLabel = (role: UserRole) => {
  const map: Record<UserRole, string> = {
    [UserRole.GUEST]: '游客',
    [UserRole.STUDENT]: '学生',
    [UserRole.TA]: '助教',
    [UserRole.TEACHER]: '教师',
    [UserRole.ADMIN]: '管理员',
    [UserRole.ROOT]: '超管'
  };
  return map[role] || role;
};

const getRoleType = (role: UserRole) => {
  if (role === UserRole.ROOT) return 'error';
  if (role === UserRole.ADMIN) return 'warning';
  if (role === UserRole.TEACHER) return 'info';
  if (role === UserRole.TA) return 'success';
  return 'default';
};

// 筛选区学院变化
const handleCollegeChange = async (value: string) => {
  filters.grade = '';
  filters.class = '';
  if (value) {
    await fetchGradesByCollege(value);
  } else {
    gradeOptions.value = [];
    classOptions.value = [];
  }
};

// 筛选区年级变化
const handleGradeChange = async (value: string) => {
  filters.class = '';
  if (value && filters.college) {
    await fetchClassesByCollegeAndGrade(filters.college, value);
  } else {
    classOptions.value = [];
  }
};

// 编辑表单学院变化
const handleEditCollegeChange = async (value: string) => {
  editForm.grade = '';
  editForm.class = '';
  if (value) {
    await fetchGradesByCollege(value);
  } else {
    gradeOptions.value = [];
    classOptions.value = [];
  }
};

// 编辑表单年级变化
const handleEditGradeChange = async (value: string) => {
  editForm.class = '';
  if (value && editForm.college) {
    await fetchClassesByCollegeAndGrade(editForm.college, value);
  } else {
    classOptions.value = [];
  }
};

// 添加表单学院变化
const handleAddCollegeChange = async (value: string) => {
  addUserForm.grade = '';
  addUserForm.class = '';
  if (value) {
    await fetchGradesByCollege(value);
  } else {
    gradeOptions.value = [];
    classOptions.value = [];
  }
};

// 添加表单年级变化
const handleAddGradeChange = async (value: string) => {
  addUserForm.class = '';
  if (value && addUserForm.college) {
    await fetchClassesByCollegeAndGrade(addUserForm.college, value);
  } else {
    classOptions.value = [];
  }
};

// 文件上传变化
const handleFileChange = (options: { fileList: UploadFileInfo[] }) => {
  const firstFile = options.fileList[0];
  if (firstFile?.file) {
    importForm.file = firstFile.file as File;
  } else {
    importForm.file = null;
  }
};

// 初始化加载学院列表
onMounted(() => {
  fetchColleges();
});

const columns: DataTableColumns<UserItem> = [
  {
    type: 'selection'
  },
  {
    title: 'UID',
    key: 'uid',
    width: 140,
    ellipsis: { tooltip: true }
  },
  {
    title: '用户名',
    key: 'username',
    width: 140,
    ellipsis: { tooltip: true },
    render: (row) => h('span', { style: 'font-weight: 500' }, row.username)
  },
  {
    title: '邮箱',
    key: 'email',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: '班级',
    key: 'class',
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => row.class || '-'
  },
  {
    title: '角色',
    key: 'role',
    width: 100,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: getRoleType(row.role), bordered: false },
        () => getRoleLabel(row.role)
      )
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) =>
      h(
        NTag,
        {
          size: 'small',
          type: row.status === 'normal' ? 'success' : 'error',
          bordered: false
        },
        () => (row.status === 'normal' ? '正常' : '禁用')
      )
  },
  {
    title: '成就数',
    key: 'achievementCount',
    width: 80,
    align: 'center'
  },
  {
    title: '最近登录',
    key: 'lastLogin',
    width: 160,
    render: (row) => (row.lastLogin ? formatFullTime(row.lastLogin) : '-')
  },
  {
    title: '注册时间',
    key: 'registerTime',
    width: 160,
    render: (row) => formatFullTime(row.registerTime)
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    fixed: 'right',
    render(row) {
      const moreOptions = [
        {
          label: '转移源码',
          key: 'transfer',
          icon: () => h(NIcon, { size: 16 }, () => h(SwapHorizontalOutline))
        },
        {
          label: '添加成就',
          key: 'achievement',
          icon: () => h(NIcon, { size: 16 }, () => h(TrophyOutline))
        },
        {
          label: '指定登录 IP',
          key: 'ip',
          icon: () => h(NIcon, { size: 16 }, () => h(LockClosedOutline))
        }
      ];

      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              type: 'primary',
              onClick: () => openEditModal(row)
            },
            { icon: () => h(CreateOutline), default: () => '编辑' }
          ),
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              type: 'info',
              onClick: () => openPasswordModal(row)
            },
            { icon: () => h(KeyOutline), default: () => '密码' }
          ),
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              type: 'error',
              onClick: () => handleDelete(row)
            },
            { icon: () => h(TrashOutline), default: () => '删除' }
          ),
          h(
            NDropdown,
            {
              options: moreOptions,
              onSelect: (key: string) => {
                if (key === 'transfer') openTransferModal(row);
                else if (key === 'achievement') openAchievementModal(row);
                else if (key === 'ip') openIpModal(row);
              }
            },
            {
              default: () =>
                h(
                  NButton,
                  { size: 'tiny', secondary: true },
                  { icon: () => h(EllipsisHorizontalOutline), default: () => '更多' }
                )
            }
          )
        ]
      });
    }
  }
];
</script>

<style scoped lang="less">
.user-list-page {
  :deep(.n-data-table) {
    font-size: 13px;
  }
}
</style>
