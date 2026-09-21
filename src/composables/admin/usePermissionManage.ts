import { ref, reactive } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import {
  batchRevokePermissions,
  getPermissionUsers,
  grantPermissions,
  revokeUserPermission,
  searchAdminUsers,
  updateUserPermission,
  type PermissionUserVo,
  type UserSearchVo,
} from '@/utils/api';

// 后端 resolveManageableRoleId 只接受 admin/teacher/ta（大小写不敏感，RoleConstant 为小写）
export type ManageableRole = 'TA' | 'TEACHER' | 'ADMIN';

// 权限用户接口
export interface PermissionUserItem {
  uid: string;
  username: string;
  college: string;
  majorClass: string;
  email: string;
  phone: string;
  // 后端返回的全部真实角色（小写），不丢多角色
  roles: string[];
}

// 搜索结果用户接口
export interface SearchUserItem {
  uid: string;
  username: string;
  majorClass: string;
  college: string;
  roles: string[];
}

export function toPermissionUserItem(vo: PermissionUserVo): PermissionUserItem {
  return {
    uid: vo.uid,
    username: vo.username ?? '',
    college: vo.college ?? '',
    majorClass: vo.majorClass ?? '-',
    email: vo.email ?? '',
    phone: vo.phone ?? '',
    roles: vo.roles ?? [],
  };
}

export function toSearchUserItem(vo: UserSearchVo): SearchUserItem {
  return {
    uid: vo.uid,
    username: vo.username ?? '',
    majorClass: vo.majorClass ?? '-',
    college: vo.college ?? '',
    roles: vo.roles ?? [],
  };
}

export function usePermissionManage() {
  const message = useMessage();
  const dialog = useDialog();

  const loading = ref(false);
  const searchLoading = ref(false);
  const submitting = ref(false);

  // 模态框状态
  const showAddModal = ref(false);
  const showEditModal = ref(false);

  // 搜索相关
  const searchQuery = ref('');
  const searchResultList = ref<SearchUserItem[]>([]);
  const searchPagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    onChange: (page: number) => {
      // 翻页保留用户请求的页码
      searchPagination.page = page;
      void fetchSearchResults();
    },
  });
  const selectedSearchUserIds = ref<string[]>([]);
  const selectedPermission = ref<ManageableRole | null>(null);

  // 权限列表相关
  const permissionUserList = ref<PermissionUserItem[]>([]);

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    onChange: (page: number) => {
      pagination.page = page;
      void fetchPermissionUsers();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      void fetchPermissionUsers();
    },
  });

  const selectedUserIds = ref<string[]>([]);

  // 编辑相关
  const editForm = reactive({
    uid: '',
    username: '',
    role: null as ManageableRole | null,
  });

  // 权限选项（请求值使用后端可识别的大写角色名）
  const roleOptions = [
    { label: '助教 (TA)', value: 'TA' },
    { label: '教师 (TEACHER)', value: 'TEACHER' },
    { label: '管理员 (ADMIN)', value: 'ADMIN' },
  ];

  // 请求序号：迟到的旧响应不得覆盖新分页/新搜索的结果
  let permissionSeq = 0;
  let searchSeq = 0;

  // 获取权限用户列表
  const fetchPermissionUsers = async () => {
    const current = ++permissionSeq;
    loading.value = true;
    try {
      const data = await getPermissionUsers(pagination.page, pagination.pageSize);
      if (current !== permissionSeq) return;
      const rows = (data?.list ?? []).map(toPermissionUserItem);
      // 删除权限后当前页可能被清空：回退上一页重读，不停留在空页
      if (rows.length === 0 && pagination.page > 1) {
        pagination.page -= 1;
        void fetchPermissionUsers();
        return;
      }
      permissionUserList.value = rows;
      pagination.itemCount = data?.total ?? 0;
    } catch (err) {
      if (current !== permissionSeq) return;
      permissionUserList.value = [];
      pagination.itemCount = 0;
      message.error(err instanceof Error ? err.message : '加载权限用户失败');
    } finally {
      if (current === permissionSeq) loading.value = false;
    }
  };

  // 搜索用户（后端要求 query 不能为空）；沿用当前页码，供翻页复用
  const fetchSearchResults = async () => {
    const query = searchQuery.value.trim();
    if (!query) {
      message.warning('请输入 UID 或姓名');
      return;
    }
    const current = ++searchSeq;
    searchLoading.value = true;
    try {
      const data = await searchAdminUsers(query, searchPagination.page, searchPagination.pageSize);
      if (current !== searchSeq) return;
      searchResultList.value = (data?.list ?? []).map(toSearchUserItem);
      searchPagination.itemCount = data?.total ?? 0;
    } catch (err) {
      if (current !== searchSeq) return;
      searchResultList.value = [];
      searchPagination.itemCount = 0;
      message.error(err instanceof Error ? err.message : '搜索用户失败');
    } finally {
      if (current === searchSeq) searchLoading.value = false;
    }
  };

  // 点击搜索 / 回车：回到第 1 页再查询
  const handleSearch = () => {
    searchPagination.page = 1;
    return fetchSearchResults();
  };

  // 打开添加模态框（不自动搜索，避免空 query 触发后端 400）
  const openAddModal = () => {
    searchQuery.value = '';
    searchResultList.value = [];
    searchPagination.page = 1;
    searchPagination.itemCount = 0;
    selectedSearchUserIds.value = [];
    selectedPermission.value = null;
    showAddModal.value = true;
  };

  // 提交添加权限
  const handleAddSubmit = async () => {
    if (selectedSearchUserIds.value.length === 0) {
      message.warning('请选择用户');
      return;
    }
    if (!selectedPermission.value) {
      message.warning('请选择要赋予的权限');
      return;
    }

    submitting.value = true;
    try {
      await grantPermissions([...selectedSearchUserIds.value], selectedPermission.value);
      message.success('权限添加成功');
      showAddModal.value = false;
      await fetchPermissionUsers();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '权限添加失败');
    } finally {
      submitting.value = false;
    }
  };

  // 打开编辑模态框
  const openEditModal = (user: PermissionUserItem) => {
    editForm.uid = user.uid;
    editForm.username = user.username;
    editForm.role = pickManageableRole(user.roles);
    showEditModal.value = true;
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    if (!editForm.role) {
      message.warning('请选择权限');
      return;
    }
    submitting.value = true;
    try {
      await updateUserPermission(editForm.uid, editForm.role);
      message.success('权限修改成功');
      showEditModal.value = false;
      await fetchPermissionUsers();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '权限修改失败');
    } finally {
      submitting.value = false;
    }
  };

  // 删除权限（回归学生）
  const handleDelete = (user: PermissionUserItem) => {
    dialog.warning({
      title: '删除权限确认',
      content: `确定要删除用户 "${user.username}" (${user.uid}) 的权限吗？该用户将回归 STUDENT 身份。`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起不可逆请求
        if (loading.value) return;
        loading.value = true;
        try {
          await revokeUserPermission(user.uid);
          message.success('权限已删除，用户回归 STUDENT 身份');
          await fetchPermissionUsers();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '权限删除失败');
        } finally {
          loading.value = false;
        }
      },
    });
  };

  // 批量删除权限
  const handleBatchDelete = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    const count = selectedUserIds.value.length;
    dialog.warning({
      title: '批量删除权限确认',
      content: `确定要删除选中的 ${count} 个用户的权限吗？这些用户将回归 STUDENT 身份。`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起不可逆请求
        if (loading.value) return;
        loading.value = true;
        try {
          await batchRevokePermissions([...selectedUserIds.value]);
          selectedUserIds.value = [];
          message.success(`已删除 ${count} 个用户的权限`);
          await fetchPermissionUsers();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '批量删除权限失败');
        } finally {
          loading.value = false;
        }
      },
    });
  };

  return {
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
    fetchPermissionUsers,
    handleSearch,
    openAddModal,
    handleAddSubmit,
    openEditModal,
    handleEditSubmit,
    handleDelete,
    handleBatchDelete,
  };
}

/**
 * 从后端角色列表中挑选当前可管理的角色用于编辑回显。
 * 提交编辑会替换该用户既有的可管理角色（不是追加），因此编辑弹窗需明确提示。
 */
export function pickManageableRole(roles: readonly string[] | null | undefined): ManageableRole | null {
  if (!roles) return null;
  const upper = roles.map((role) => role.toUpperCase());
  if (upper.includes('ADMIN')) return 'ADMIN';
  if (upper.includes('TEACHER')) return 'TEACHER';
  if (upper.includes('TA')) return 'TA';
  return null;
}
