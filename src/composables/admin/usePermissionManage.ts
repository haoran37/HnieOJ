import { ref, reactive } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { UserRole } from '@/stores/userStore';

// 权限用户接口
export interface PermissionUserItem {
  uid: string;
  username: string; // 姓名
  college: string;
  majorClass: string; // 专业班级
  email: string;
  phone: string;
  role: UserRole;
}

// 搜索结果用户接口
export interface SearchUserItem {
  uid: string;
  username: string;
  majorClass: string;
  college: string;
  role: UserRole;
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
      searchPagination.page = page;
      handleSearch();
    }
  });
  const selectedSearchUserIds = ref<string[]>([]);
  const selectedPermission = ref<UserRole | null>(null);

  // 权限列表相关
  const permissionUserList = ref<PermissionUserItem[]>([
    {
      uid: '202202050232',
      username: '张老师',
      college: '信息科学与工程学院',
      majorClass: '-',
      email: 'teacher01@hnie.edu.cn',
      phone: '13800138000',
      role: UserRole.TEACHER
    },
    {
      uid: '202202050233',
      username: '李管理员',
      college: '信息科学与工程学院',
      majorClass: '-',
      email: 'admin01@hnie.edu.cn',
      phone: '13900139000',
      role: UserRole.ADMIN
    },
    {
      uid: '202202050234',
      username: '王助教',
      college: '信息科学与工程学院',
      majorClass: '计算机2202',
      email: 'ta01@hnie.edu.cn',
      phone: '13700137000',
      role: UserRole.TA
    }
  ]);
  
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: permissionUserList.value.length,
    onChange: (page: number) => {
      pagination.page = page;
      fetchPermissionUsers();
    }
  });

  const selectedUserIds = ref<string[]>([]);

  // 编辑相关
  const editForm = reactive({
    uid: '',
    username: '',
    role: null as UserRole | null
  });

  // 权限选项
  const roleOptions = [
    { label: '助教 (TA)', value: UserRole.TA },
    { label: '教师 (TEACHER)', value: UserRole.TEACHER },
    { label: '管理员 (ADMIN)', value: UserRole.ADMIN }
  ];

  // 获取权限用户列表
  const fetchPermissionUsers = async () => {
    loading.value = true;
    // TODO: 调用 GET /api/admin/permission/users 获取权限用户列表
    console.log(`API: GET /api/admin/permission/users?page=${pagination.page}&pageSize=${pagination.pageSize}`);
    
    // 模拟延迟
    setTimeout(() => {
      loading.value = false;
    }, 500);
  };

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.value) {
      // message.warning('请输入UID或姓名');
      // return;
      // 允许空搜索显示所有（模拟）
    }
    searchLoading.value = true;
    // TODO: 调用 GET /api/admin/users/search 搜索用户
    console.log(`API: GET /api/admin/users/search?query=${searchQuery.value}&page=${searchPagination.page}&pageSize=${searchPagination.pageSize}`);

    // 模拟数据
    setTimeout(() => {
      searchResultList.value = [
        {
          uid: '202202050235',
          username: '赵学生',
          majorClass: '软件2201',
          college: '信息科学与工程学院',
          role: UserRole.STUDENT
        },
        {
          uid: '202202050236',
          username: '钱学生',
          majorClass: '计算机2201',
          college: '信息科学与工程学院',
          role: UserRole.STUDENT
        },
        {
          uid: '202202050237',
          username: '孙学生',
          majorClass: '网络2201',
          college: '信息科学与工程学院',
          role: UserRole.STUDENT
        }
      ].filter(u => u.username.includes(searchQuery.value) || u.uid.includes(searchQuery.value));
      searchPagination.itemCount = searchResultList.value.length;
      searchLoading.value = false;
    }, 500);
  };

  // 打开添加模态框
  const openAddModal = () => {
    searchQuery.value = '';
    searchResultList.value = [];
    selectedSearchUserIds.value = [];
    selectedPermission.value = null;
    showAddModal.value = true;
    handleSearch(); // 初始加载一些数据
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
    // TODO: 调用 POST /api/admin/permission/grant 批量赋予权限
    console.log('API: POST /api/admin/permission/grant', {
      uids: selectedSearchUserIds.value,
      role: selectedPermission.value
    });

    setTimeout(() => {
      // 模拟添加到列表
      const newUsers = searchResultList.value
        .filter(u => selectedSearchUserIds.value.includes(u.uid))
        .map(u => ({
          uid: u.uid,
          username: u.username,
          college: u.college,
          majorClass: u.majorClass,
          email: `${u.uid}@hnie.edu.cn`, // 模拟邮箱
          phone: '13800000000', // 模拟手机
          role: selectedPermission.value!
        }));
      
      permissionUserList.value.push(...newUsers);
      pagination.itemCount = permissionUserList.value.length;

      message.success('权限添加成功');
      submitting.value = false;
      showAddModal.value = false;
    }, 500);
  };

  // 打开编辑模态框
  const openEditModal = (user: PermissionUserItem) => {
    editForm.uid = user.uid;
    editForm.username = user.username;
    editForm.role = user.role;
    showEditModal.value = true;
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    if (!editForm.role) {
      message.warning('请选择权限');
      return;
    }
    submitting.value = true;
    // TODO: 调用 PUT /api/admin/permission/update 更新用户权限
    console.log('API: PUT /api/admin/permission/update', {
      uid: editForm.uid,
      role: editForm.role
    });

    setTimeout(() => {
      const index = permissionUserList.value.findIndex(u => u.uid === editForm.uid);
      if (index !== -1 && editForm.role) {
        const user = permissionUserList.value[index];
        if (user) {
          user.role = editForm.role;
        }
      }
      message.success('权限修改成功');
      submitting.value = false;
      showEditModal.value = false;
    }, 500);
  };

  // 删除权限（回归学生）
  const handleDelete = (user: PermissionUserItem) => {
    dialog.warning({
      title: '删除权限确认',
      content: `确定要删除用户 "${user.username}" (${user.uid}) 的权限吗？该用户将回归 STUDENT 身份。`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: () => {
        loading.value = true;
        // TODO: 调用 DELETE /api/admin/permission/revoke 撤销权限
        console.log('API: DELETE /api/admin/permission/revoke', { uid: user.uid });

        setTimeout(() => {
          permissionUserList.value = permissionUserList.value.filter(u => u.uid !== user.uid);
          pagination.itemCount = permissionUserList.value.length;
          message.success('权限已删除，用户回归 STUDENT 身份');
          loading.value = false;
        }, 500);
      }
    });
  };

  // 批量删除权限
  const handleBatchDelete = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    dialog.warning({
      title: '批量删除权限确认',
      content: `确定要删除选中的 ${selectedUserIds.value.length} 个用户的权限吗？这些用户将回归 STUDENT 身份。`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: () => {
        loading.value = true;
        // TODO: 调用 DELETE /api/admin/permission/batch-revoke 批量撤销权限
        console.log('API: DELETE /api/admin/permission/batch-revoke', { uids: selectedUserIds.value });

        setTimeout(() => {
          permissionUserList.value = permissionUserList.value.filter(u => !selectedUserIds.value.includes(u.uid));
          pagination.itemCount = permissionUserList.value.length;
          selectedUserIds.value = [];
          message.success(`已删除 ${selectedUserIds.value.length} 个用户的权限`);
          loading.value = false;
        }, 500);
      }
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
    handleBatchDelete
  };
}
