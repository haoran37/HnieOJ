<template>
  <div class="user-list-page">
    <n-card :bordered="false" title="用户管理">
      <template #header-extra>
        <n-space>
          <n-button type="primary" @click="openAddUserModal">
            <template #icon><n-icon><PersonAddOutline /></n-icon></template>
            添加
          </n-button>
          <n-button type="info" @click="openImportModal">
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

      <!-- 筛选区（仅后端真实支持的字段） -->
      <n-space :size="12" align="center" style="margin-bottom: 16px">
        <n-input
          v-model:value="filters.keyword"
          placeholder="用户名 / UID"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <n-select
          v-model:value="filters.collegeId"
          placeholder="学院"
          clearable
          filterable
          :options="collegeOptions"
          style="width: 200px"
          @update:value="handleFilterCollegeChange"
        />
        <n-select
          v-model:value="filters.grade"
          placeholder="年级"
          clearable
          filterable
          :options="filterGradeOptions"
          :disabled="!filters.collegeId"
          style="width: 120px"
          @update:value="handleFilterGradeChange"
        />
        <n-select
          v-model:value="filters.classId"
          placeholder="班级"
          clearable
          filterable
          :options="filterClassOptions"
          :disabled="!filters.grade"
          style="width: 160px"
        />
        <n-button type="primary" @click="handleSearch">查询</n-button>
        <n-button @click="resetFilters">重置</n-button>
      </n-space>

      <!-- 用户列表（服务端分页，total 来自后端） -->
      <n-data-table
        remote
        :columns="columns"
        :data="userList"
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
      style="width: auto; min-width: 640px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="80" :disabled="submitting">
        <n-form-item label="UID" required>
          <n-input v-model:value="editForm.uid" disabled />
        </n-form-item>
        <n-form-item label="用户名" required>
          <n-input v-model:value="editForm.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="邮箱">
          <n-input v-model:value="editForm.email" placeholder="留空表示不修改" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="editForm.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="学院">
          <n-select
            v-model:value="editForm.collegeId"
            :options="collegeOptions"
            filterable
            clearable
            @update:value="handleEditCollegeChange"
          />
        </n-form-item>
        <n-form-item label="年级">
          <n-select
            v-model:value="editForm.grade"
            :options="editGradeOptions"
            filterable
            clearable
            :disabled="!editForm.collegeId"
            @update:value="handleEditGradeChange"
          />
        </n-form-item>
        <n-form-item label="班级">
          <n-select
            v-model:value="editForm.classId"
            :options="editClassOptions"
            filterable
            clearable
            :disabled="!editForm.grade"
            @update:value="handleEditClassChange"
          />
        </n-form-item>
        <ClassStaffReadonly
          :loading="classStaffLoading"
          :error="classStaffError"
          :teachers="classTeachers"
          :tas="classTas"
        />
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
      style="width: auto; min-width: 640px; max-width: 90vw"
    >
      <n-form label-placement="left" :label-width="80" :disabled="submitting">
        <n-form-item label="UID" required>
          <n-input v-model:value="addUserForm.uid" placeholder="请输入UID" />
        </n-form-item>
        <n-form-item label="用户名" required>
          <n-input v-model:value="addUserForm.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="邮箱">
          <n-input v-model:value="addUserForm.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item label="初始密码">
          <n-input
            v-model:value="addUserForm.password"
            type="password"
            show-password-on="click"
            placeholder="留空由后端生成随机初始密码"
          />
        </n-form-item>
        <n-form-item label="学院">
          <n-select
            v-model:value="addUserForm.collegeId"
            :options="collegeOptions"
            filterable
            clearable
            @update:value="handleAddCollegeChange"
          />
        </n-form-item>
        <n-form-item label="年级">
          <n-select
            v-model:value="addUserForm.grade"
            :options="addGradeOptions"
            filterable
            clearable
            :disabled="!addUserForm.collegeId"
            @update:value="handleAddGradeChange"
          />
        </n-form-item>
        <n-form-item label="班级">
          <n-select
            v-model:value="addUserForm.classId"
            :options="addClassOptions"
            filterable
            clearable
            :disabled="!addUserForm.grade"
            @update:value="handleAddClassChange"
          />
        </n-form-item>
        <ClassStaffReadonly
          :loading="classStaffLoading"
          :error="classStaffError"
          :teachers="classTeachers"
          :tas="classTas"
        />
        <n-alert type="info" style="margin-top: 8px">
          默认角色为学生；年级、班级与班级师资来自基础数据。
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

    <!-- 成就管理模态框 -->
    <n-modal
      v-model:show="showAchievementModal"
      preset="card"
      title="用户成就管理"
      style="width: auto; min-width: 640px; max-width: 90vw"
      :mask-closable="false"
    >
      <n-space vertical :size="16">
        <n-alert type="info" :show-icon="false">
          用户：{{ achievementForm.username }} ({{ achievementForm.uid }})
        </n-alert>

        <n-divider style="margin: 0">已有成就</n-divider>

        <n-scrollbar style="min-height: 180px; max-height: 220px; padding-right: 10px;">
          <n-list v-if="achievementForm.achievements.length > 0" bordered>
            <n-list-item v-for="ach in achievementForm.achievements" :key="ach.id">
              <template #suffix>
                <n-button
                  size="small"
                  type="error"
                  secondary
                  :loading="submitting"
                  @click="handleDeleteAchievement(ach.id)"
                >
                  删除
                </n-button>
              </template>
              <n-space vertical :size="4">
                <n-text strong>{{ ach.title || ach.content }}</n-text>
                <n-text v-if="ach.title && ach.content" depth="3">{{ ach.content }}</n-text>
                <n-text v-if="ach.proofUrl" depth="3" style="font-size: 12px">
                  证明：{{ ach.proofUrl }}
                </n-text>
                <n-text depth="3" style="font-size: 12px">
                  {{ ach.achieveTime ? formatFullTime(ach.achieveTime) : '无时间' }}
                </n-text>
              </n-space>
            </n-list-item>
          </n-list>
          <n-empty v-else description="暂无成就" />
        </n-scrollbar>

        <n-divider style="margin: 0">添加新成就</n-divider>

        <n-form label-placement="left" :label-width="80">
          <n-form-item label="标题">
            <n-input v-model:value="achievementForm.newTitle" placeholder="选填" />
          </n-form-item>
          <n-form-item label="成就内容" required>
            <n-input
              v-model:value="achievementForm.newContent"
              placeholder="请输入成就内容"
              type="textarea"
              :rows="2"
            />
          </n-form-item>
          <n-form-item label="证明 URL">
            <n-input v-model:value="achievementForm.newProofUrl" placeholder="选填" />
          </n-form-item>
          <n-form-item label="获得时间">
            <n-date-picker
              v-model:value="achievementForm.newDate"
              type="date"
              style="width: 100%"
            />
          </n-form-item>
          <n-form-item :show-label="false">
            <n-button type="primary" :loading="submitting" @click="handleAddAchievement">
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

    <!-- 用户详情（按 uid 真实读取 /api/user/users/{uid}） -->
    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="用户详情"
      style="width: auto; min-width: 560px; max-width: 90vw"
      :mask-closable="false"
    >
      <n-spin :show="detailLoading">
        <n-descriptions v-if="detail" :column="1" label-placement="left" bordered size="small">
          <n-descriptions-item label="UID">{{ detail.uid }}</n-descriptions-item>
          <n-descriptions-item label="用户名">{{ detail.username }}</n-descriptions-item>
          <n-descriptions-item label="真实姓名">{{ detail.realname || '-' }}</n-descriptions-item>
          <n-descriptions-item label="学院">{{ detail.college || '-' }}</n-descriptions-item>
          <n-descriptions-item label="年级">{{ detail.grade || '-' }}</n-descriptions-item>
          <n-descriptions-item label="班级">{{ detail.majorClass || '-' }}</n-descriptions-item>
          <n-descriptions-item label="角色">{{ normalizeRoles(detail.roles || []).join(' / ') || '—' }}</n-descriptions-item>
          <n-descriptions-item label="CF 用户名">{{ detail.cf_username || '-' }}</n-descriptions-item>
          <n-descriptions-item label="GitHub">{{ detail.github || '-' }}</n-descriptions-item>
          <n-descriptions-item label="博客">{{ detail.blog || '-' }}</n-descriptions-item>
        </n-descriptions>
      </n-spin>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showDetailModal = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 导入用户模态框（真实上传 POST /api/users/import） -->
    <n-modal
      v-model:show="showImportModal"
      preset="card"
      title="导入用户"
      :mask-closable="false"
      :closable="!submitting"
      :close-on-esc="!submitting"
      style="width: auto; min-width: 640px; max-width: 90vw"
      @after-leave="handleImportModalAfterLeave"
    >
      <n-space vertical :size="16">
        <n-alert type="info" :show-icon="false">
          支持 .xls / .xlsx 单文件；表头必须为 uid、username、email、password、phone、avatar、collegeId、classId、grade（列顺序不限），单次最多 1000 行数据。
          uid、username 必填；password 留空时由后端生成初始密码并在下方结果中显示。
        </n-alert>

        <n-space align="center">
          <n-button text type="primary" :disabled="submitting" @click="handleDownloadTemplate">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            下载模板
          </n-button>
          <span class="tip-text">下载模板后按上述表头填写，列顺序不限</span>
        </n-space>

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

          <n-space v-if="importResult.createdUsers.length > 0" vertical :size="8">
            <n-text strong>已创建用户（初始密码仅在本窗口显示，关闭后清除）</n-text>
            <n-list bordered>
              <n-list-item v-for="created in importResult.createdUsers" :key="created.uid">
                <n-space align="center" :size="12">
                  <n-text>{{ created.uid }}</n-text>
                  <n-text code>{{ created.initialPassword || '（该行已填写密码）' }}</n-text>
                </n-space>
              </n-list-item>
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
  useMessage,
  type DataTableColumns,
  type UploadFileInfo,
  type UploadOnChange,
} from 'naive-ui';
import {
  PersonAddOutline,
  CloudUploadOutline,
  CreateOutline,
  KeyOutline,
  TrophyOutline,
  SearchOutline,
  EyeOutline,
  TrashOutline,
  DownloadOutline,
} from '@vicons/ionicons5';
import { useUserManage, USER_STATUS, type UserItem } from '@/composables/admin/useUserManage';
import { normalizeRoles } from '@/types/user';
import ClassStaffReadonly from './components/ClassStaffReadonly.vue';

const {
  loading,
  submitting,
  checking,
  userList,
  selectedUserIds,
  filters,
  pagination,
  showEditModal,
  showPasswordModal,
  showAchievementModal,
  showAddUserModal,
  showImportModal,
  showDetailModal,
  detailLoading,
  detail,
  editForm,
  passwordForm,
  achievementForm,
  addUserForm,
  importFile,
  importResult,
  collegeOptions,
  filterGradeOptions,
  filterClassOptions,
  editGradeOptions,
  editClassOptions,
  addGradeOptions,
  addClassOptions,
  classTeachers,
  classTas,
  classStaffLoading,
  classStaffError,
  fetchColleges,
  fetchUsers,
  handleSearch,
  resetFilters,
  handleFilterCollegeChange,
  handleFilterGradeChange,
  handleEditCollegeChange,
  handleEditGradeChange,
  handleEditClassChange,
  handleAddCollegeChange,
  handleAddGradeChange,
  handleAddClassChange,
  openEditModal,
  handleEditSubmit,
  openPasswordModal,
  handlePasswordSubmit,
  handleCheckUser,
  openDetailModal,
  openAchievementModal,
  handleAddAchievement,
  handleDeleteAchievement,
  handleDelete,
  handleBatchDisable,
  handleBatchEnable,
  handleBatchDelete,
  openAddUserModal,
  handleAddUser,
  openImportModal,
  closeImportModal,
  handleImportModalAfterLeave,
  handleImportFileChange,
  handleImport,
  handleDownloadTemplate,
  formatFullTime,
} = useUserManage();

// 上传组件展示的受控列表始终来自 composable 中唯一一份待导入文件：
// 校验被拒、导入完成、关闭弹窗后都不会残留旧文件误导重复导入
const importFileList = computed<UploadFileInfo[]>(() => {
  const file = importFile.value;
  if (!file) return [];
  return [{ id: 'user-import-file', name: file.name, status: 'pending', file }];
});

const handleImportUploadChange: UploadOnChange = ({ fileList }) => {
  handleImportFileChange(fileList[fileList.length - 1]?.file ?? null);
};

const importResultType = computed(() => {
  if (!importResult.value || importResult.value.failedCount === 0) return 'success';
  return importResult.value.successCount > 0 ? 'warning' : 'error';
});

const statusOptions = [
  { label: '正常', value: USER_STATUS.NORMAL },
  { label: '禁用', value: USER_STATUS.DISABLED },
];

const message = useMessage();

const roleText = (roles: string[]) => normalizeRoles(roles).join(' / ') || '—';

const getStatusText = (status: number) => (status === USER_STATUS.DISABLED ? '禁用' : '正常');

const columns: DataTableColumns<UserItem> = [
  { type: 'selection' },
  {
    title: 'UID',
    key: 'uid',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: '用户名',
    key: 'username',
    width: 140,
    ellipsis: { tooltip: true },
    render: (row) => h('span', { style: 'font-weight: 500' }, row.username),
  },
  {
    title: '真实姓名',
    key: 'realname',
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => row.realname || '-',
  },
  {
    title: '学院',
    key: 'college',
    width: 180,
    ellipsis: { tooltip: true },
    render: (row) => row.college || '-',
  },
  {
    title: '年级',
    key: 'grade',
    width: 90,
    ellipsis: { tooltip: true },
    render: (row) => row.grade || '-',
  },
  {
    title: '班级',
    key: 'majorClass',
    width: 140,
    ellipsis: { tooltip: true },
    render: (row) => row.majorClass || '-',
  },
  {
    title: '角色',
    key: 'roles',
    width: 150,
    render: (row) =>
      h(
        NTag,
        {
          size: 'small',
          type: row.primaryRole === 'ROOT' ? 'error' : row.primaryRole === 'ADMIN' ? 'warning' : 'default',
          bordered: false,
        },
        () => roleText(row.roles),
      ),
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
          type: row.status === USER_STATUS.NORMAL ? 'success' : 'error',
          bordered: false,
        },
        () => getStatusText(row.status),
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 400,
    fixed: 'right',
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              type: 'primary',
              onClick: () => openEditModal(row),
            },
            { icon: () => h(CreateOutline), default: () => '编辑' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              type: 'info',
              onClick: () => openPasswordModal(row),
            },
            { icon: () => h(KeyOutline), default: () => '密码' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              onClick: () => openAchievementModal(row),
            },
            { icon: () => h(TrophyOutline), default: () => '成就' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              onClick: () => openDetailModal(row),
            },
            { icon: () => h(EyeOutline), default: () => '详情' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              loading: checking.value,
              onClick: () => handleCheckUser(row.uid),
            },
            { icon: () => h(SearchOutline), default: () => '查验' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              type: 'error',
              onClick: () => handleDelete(row),
            },
            { icon: () => h(TrashOutline), default: () => '删除' },
          ),
        ],
      });
    },
  },
];

onMounted(async () => {
  try {
    await fetchColleges();
  } catch (err) {
    // composable 不吞错，这里显式提示真实的学院加载错误
    message.error(err instanceof Error ? err.message : '加载学院列表失败');
  }
  void fetchUsers();
});
</script>

<style scoped lang="less">
.user-list-page {
  :deep(.n-data-table) {
    font-size: 13px;
  }

  .tip-text {
    font-size: 12px;
    color: #999;
  }
}
</style>
