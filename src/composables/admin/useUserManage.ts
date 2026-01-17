import { ref, reactive, computed } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { UserRole } from '@/stores/userStore';

// 用户数据接口
export interface UserItem {
  uid: string;
  username: string;
  email: string;
  role: UserRole;
  status: 'normal' | 'disabled';
  college?: string;
  grade?: string;
  class?: string;
  achievementCount: number;
  lastLogin: number;
  registerTime: number;
  ipWhitelist?: string[];
  ipRestricted?: boolean;
}

// 成就接口
export interface Achievement {
  id: string;
  content: string;
  date: number;
}

// 筛选条件
export interface FilterParams {
  keyword: string;
  email: string;
  role: UserRole | null;
  status: 'normal' | 'disabled' | null;
  registerTimeRange: [number, number] | null;
  college: string;
  grade: string;
  class: string;
}

export function useUserManage() {
  const message = useMessage();
  const dialog = useDialog();
  
  const loading = ref(false);
  const submitting = ref(false);
  
  // 模态框状态
  const showEditModal = ref(false);
  const showPasswordModal = ref(false);
  const showTransferModal = ref(false);
  const showAchievementModal = ref(false);
  const showIpModal = ref(false);
  const showBatchCreateModal = ref(false);
  const showAddUserModal = ref(false);
  const showImportModal = ref(false);
  
  // 筛选条件
  const filters = reactive<FilterParams>({
    keyword: '',
    email: '',
    role: null,
    status: null,
    registerTimeRange: null,
    college: '',
    grade: '',
    class: ''
  });

  // 用户列表 (模拟数据)
  const userList = ref<UserItem[]>([
    {
      uid: '202202050231',
      username: 'student01',
      email: 'student01@hnie.edu.cn',
      role: UserRole.STUDENT,
      status: 'normal',
      college: '信息科学与工程学院',
      grade: '2022',
      class: '计算机2202',
      achievementCount: 5,
      lastLogin: Date.now() - 3600000,
      registerTime: Date.now() - 86400000 * 30
    },
    {
      uid: '202202050232',
      username: 'teacher01',
      email: 'teacher01@hnie.edu.cn',
      role: UserRole.TEACHER,
      status: 'normal',
      achievementCount: 0,
      lastLogin: Date.now() - 7200000,
      registerTime: Date.now() - 86400000 * 60
    },
    {
      uid: '202202050233',
      username: 'admin01',
      email: 'admin01@hnie.edu.cn',
      role: UserRole.ADMIN,
      status: 'normal',
      achievementCount: 0,
      lastLogin: Date.now() - 1800000,
      registerTime: Date.now() - 86400000 * 90
    }
  ]);

  // 选中的用户
  const selectedUserIds = ref<string[]>([]);

  // 编辑表单
  const editForm = reactive({
    uid: '',
    username: '',
    email: '',
    status: 'normal' as 'normal' | 'disabled',
    college: '',
    grade: '',
    class: ''
  });

  // 添加用户表单
  const addUserForm = reactive({
    uid: '',
    username: '',
    email: '',
    college: '',
    grade: '',
    class: ''
  });

  // 导入表单
  const importForm = reactive({
    file: null as File | null
  });

  // 密码表单
  const passwordForm = reactive({
    uid: '',
    username: '',
    newPassword: ''
  });

  // 转移源码表单
  const transferForm = reactive({
    sourceUid: '',
    sourceUsername: '',
    targetUid: '',
    deleteOriginal: false
  });

  // 成就表单
  const achievementForm = reactive({
    uid: '',
    username: '',
    achievements: [] as Achievement[],
    newContent: '',
    newDate: Date.now()
  });

  // IP 限制表单
  const ipForm = reactive({
    uid: '',
    username: '',
    ipRestricted: false,
    ipWhitelist: ''
  });

  // 学院、年级、班级选项
  const collegeOptions = ref<Array<{ label: string; value: string }>>([]);
  const gradeOptions = ref<Array<{ label: string; value: string }>>([]);
  const classOptions = ref<Array<{ label: string; value: string }>>([]);

  // 筛选后的用户列表
  const filteredUserList = computed(() => {
    return userList.value.filter(user => {
      if (filters.keyword && !user.username.includes(filters.keyword) && !user.uid.includes(filters.keyword)) {
        return false;
      }
      if (filters.email && !user.email.includes(filters.email)) {
        return false;
      }
      if (filters.role && user.role !== filters.role) {
        return false;
      }
      if (filters.status && user.status !== filters.status) {
        return false;
      }
      if (filters.registerTimeRange) {
        const [start, end] = filters.registerTimeRange;
        if (user.registerTime < start || user.registerTime > end) {
          return false;
        }
      }
      if (filters.college && user.college !== filters.college) {
        return false;
      }
      if (filters.grade && user.grade !== filters.grade) {
        return false;
      }
      if (filters.class && user.class !== filters.class) {
        return false;
      }
      return true;
    });
  });

  // 获取学院列表
  const fetchColleges = async () => {
    //TODO: 调用 GET /api/colleges 获取学院列表
    console.log('API: GET /api/colleges - 获取学院列表');
    collegeOptions.value = [
      { label: '信息科学与工程学院', value: '信息科学与工程学院' },
      { label: '经济管理学院', value: '经济管理学院' },
      { label: '外国语学院', value: '外国语学院' }
    ];
  };

  // 根据学院获取年级列表
  const fetchGradesByCollege = async (college: string) => {
    //TODO: 调用 GET /api/colleges/{college}/grades 获取年级列表
    console.log(`API: GET /api/colleges/${college}/grades - 获取年级列表`);
    gradeOptions.value = [
      { label: '2022', value: '2022' },
      { label: '2023', value: '2023' },
      { label: '2024', value: '2024' }
    ];
  };

  // 根据学院和年级获取班级列表
  const fetchClassesByCollegeAndGrade = async (college: string, grade: string) => {
    //TODO: 调用 GET /api/colleges/{college}/grades/{grade}/classes 获取班级列表
    console.log(`API: GET /api/colleges/${college}/grades/${grade}/classes - 获取班级列表`);
    classOptions.value = [
      { label: '计算机2201', value: '计算机2201' },
      { label: '计算机2202', value: '计算机2202' },
      { label: '软件2201', value: '软件2201' }
    ];
  };

  // 打开编辑模态框
  const openEditModal = async (user: UserItem) => {
    editForm.uid = user.uid;
    editForm.username = user.username;
    editForm.email = user.email;
    editForm.status = user.status;
    editForm.college = user.college || '';
    editForm.grade = user.grade || '';
    editForm.class = user.class || '';
    
    await fetchColleges();
    if (editForm.college) {
      await fetchGradesByCollege(editForm.college);
      if (editForm.grade) {
        await fetchClassesByCollegeAndGrade(editForm.college, editForm.grade);
      }
    }
    
    showEditModal.value = true;
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    if (!editForm.uid || !editForm.username || !editForm.email) {
      message.warning('UID、用户名和邮箱不能为空');
      return;
    }
    submitting.value = true;
    
    //TODO: 调用 PUT /api/users/{uid} 更新用户信息
    console.log('API: PUT /api/users/' + editForm.uid, editForm);
    
    setTimeout(() => {
      const index = userList.value.findIndex(u => u.uid === editForm.uid);
      if (index !== -1) {
        const user = userList.value[index];
        if (user) {
          userList.value[index] = {
            ...user,
            uid: editForm.uid,
            username: editForm.username,
            email: editForm.email,
            status: editForm.status,
            college: editForm.college,
            grade: editForm.grade,
            class: editForm.class
          };
          message.success('更新成功');
        }
      }
      submitting.value = false;
      showEditModal.value = false;
    }, 500);
  };

  // 打开密码模态框
  const openPasswordModal = (user: UserItem) => {
    passwordForm.uid = user.uid;
    passwordForm.username = user.username;
    passwordForm.newPassword = '';
    showPasswordModal.value = true;
  };

  // 提交密码修改
  const handlePasswordSubmit = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      message.warning('密码长度至少为6位');
      return;
    }
    submitting.value = true;
    
    //TODO: 调用 PUT /api/users/{uid}/password 修改密码
    console.log('API: PUT /api/users/' + passwordForm.uid + '/password', { password: passwordForm.newPassword });
    
    setTimeout(() => {
      message.success('密码修改成功');
      submitting.value = false;
      showPasswordModal.value = false;
    }, 500);
  };

  // 打开转移源码模态框
  const openTransferModal = (user: UserItem) => {
    transferForm.sourceUid = user.uid;
    transferForm.sourceUsername = user.username;
    transferForm.targetUid = '';
    transferForm.deleteOriginal = false;
    showTransferModal.value = true;
  };

  // 提交转移源码
  const handleTransferSubmit = async () => {
    if (!transferForm.targetUid) {
      message.warning('请选择目标用户');
      return;
    }
    if (transferForm.targetUid === transferForm.sourceUid) {
      message.warning('目标用户不能是当前用户');
      return;
    }
    submitting.value = true;
    
    //TODO: 调用 POST /api/users/{sourceUid}/transfer 转移源码
    console.log('API: POST /api/users/' + transferForm.sourceUid + '/transfer', {
      targetUid: transferForm.targetUid,
      deleteOriginal: transferForm.deleteOriginal
    });
    
    setTimeout(() => {
      message.success('源码转移成功');
      submitting.value = false;
      showTransferModal.value = false;
    }, 500);
  };

  // 打开成就模态框
  const openAchievementModal = async (user: UserItem) => {
    achievementForm.uid = user.uid;
    achievementForm.username = user.username;
    achievementForm.newContent = '';
    achievementForm.newDate = Date.now();
    
    //TODO: 调用 GET /api/users/{uid}/achievements 获取用户成就列表
    console.log('API: GET /api/users/' + user.uid + '/achievements - 获取用户成就列表');
    
    achievementForm.achievements = [
      { id: '1', content: '完成首次提交', date: Date.now() - 86400000 * 10 },
      { id: '2', content: '连续签到7天', date: Date.now() - 86400000 * 5 }
    ];
    
    showAchievementModal.value = true;
  };

  // 添加成就
  const handleAddAchievement = async () => {
    if (!achievementForm.newContent) {
      message.warning('请输入成就内容');
      return;
    }
    
    //TODO: 调用 POST /api/users/{uid}/achievements 添加成就
    console.log('API: POST /api/users/' + achievementForm.uid + '/achievements', {
      content: achievementForm.newContent,
      date: achievementForm.newDate
    });
    
    achievementForm.achievements.push({
      id: Date.now().toString(),
      content: achievementForm.newContent,
      date: achievementForm.newDate
    });
    achievementForm.newContent = '';
    achievementForm.newDate = Date.now();
    message.success('成就添加成功');
  };

  // 删除成就
  const handleDeleteAchievement = async (id: string) => {
    //TODO: 调用 DELETE /api/users/{uid}/achievements/{achievementId} 删除成就
    console.log('API: DELETE /api/users/' + achievementForm.uid + '/achievements/' + id);
    
    achievementForm.achievements = achievementForm.achievements.filter(a => a.id !== id);
    message.success('成就删除成功');
  };

  // 打开 IP 限制模态框
  const openIpModal = (user: UserItem) => {
    ipForm.uid = user.uid;
    ipForm.username = user.username;
    ipForm.ipRestricted = user.ipRestricted || false;
    ipForm.ipWhitelist = user.ipWhitelist?.join('\n') || '';
    showIpModal.value = true;
  };

  // 提交 IP 限制
  const handleIpSubmit = async () => {
    submitting.value = true;
    
    //TODO: 调用 PUT /api/users/{uid}/ip-restriction 设置IP限制
    console.log('API: PUT /api/users/' + ipForm.uid + '/ip-restriction', {
      ipRestricted: ipForm.ipRestricted,
      ipWhitelist: ipForm.ipWhitelist.split('\n').map(ip => ip.trim()).filter(ip => ip)
    });
    
    setTimeout(() => {
      const index = userList.value.findIndex(u => u.uid === ipForm.uid);
      if (index !== -1) {
        const user = userList.value[index];
        if (user) {
          user.ipRestricted = ipForm.ipRestricted;
          user.ipWhitelist = ipForm.ipWhitelist
            .split('\n')
            .map(ip => ip.trim())
            .filter(ip => ip);
        }
      }
      message.success('IP 限制设置成功');
      submitting.value = false;
      showIpModal.value = false;
    }, 500);
  };

  //删除用户
  const handleDelete = (user: UserItem) => {
    dialog.warning({
      title: '删除确认',
      content: `确定要删除用户 "${user.username}" (${user.uid}) 吗？此操作不可恢复。`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: () => {
        loading.value = true;
        
        //TODO: 调用 DELETE /api/users/{uid} 删除用户
        console.log('API: DELETE /api/users/' + user.uid);
        
        setTimeout(() => {
          userList.value = userList.value.filter(u => u.uid !== user.uid);
          message.success('用户已删除');
          loading.value = false;
        }, 500);
      }
    });
  };

  // 批量禁用
  const handleBatchDisable = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    dialog.warning({
      title: '批量禁用确认',
      content: `确定要禁用选中的 ${selectedUserIds.value.length} 个用户吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        //TODO: 调用 PUT /api/users/batch/disable 批量禁用用户
        console.log('API: PUT /api/users/batch/disable', { uids: selectedUserIds.value });
        
        userList.value.forEach(user => {
          if (selectedUserIds.value.includes(user.uid)) {
            user.status = 'disabled';
          }
        });
        message.success(`已禁用 ${selectedUserIds.value.length} 个用户`);
        selectedUserIds.value = [];
      }
    });
  };

  // 批量激活
  const handleBatchEnable = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    dialog.info({
      title: '批量激活确认',
      content: `确定要激活选中的 ${selectedUserIds.value.length} 个用户吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        //TODO: 调用 PUT /api/users/batch/enable 批量激活用户
        console.log('API: PUT /api/users/batch/enable', { uids: selectedUserIds.value });
        
        userList.value.forEach(user => {
          if (selectedUserIds.value.includes(user.uid)) {
            user.status = 'normal';
          }
        });
        message.success(`已激活 ${selectedUserIds.value.length} 个用户`);
        selectedUserIds.value = [];
      }
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    dialog.error({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedUserIds.value.length} 个用户吗？此操作不可恢复！`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: () => {
        //TODO: 调用 DELETE /api/users/batch 批量删除用户
        console.log('API: DELETE /api/users/batch', { uids: selectedUserIds.value });
        
        userList.value = userList.value.filter(u => !selectedUserIds.value.includes(u.uid));
        message.success(`已删除 ${selectedUserIds.value.length} 个用户`);
        selectedUserIds.value = [];
      }
    });
  };

  // 添加单个用户
  const handleAddUser = async () => {
    if (!addUserForm.uid || !addUserForm.username || !addUserForm.email) {
      message.warning('UID、用户名和邮箱不能为空');
      return;
    }
    submitting.value = true;
    
    //TODO: 调用 POST /api/users 创建用户
    console.log('API: POST /api/users', addUserForm);
    
    setTimeout(() => {
      userList.value.push({
        uid: addUserForm.uid,
        username: addUserForm.username,
        email: addUserForm.email,
        role: UserRole.STUDENT,
        status: 'normal',
        college: addUserForm.college,
        grade: addUserForm.grade,
        class: addUserForm.class,
        achievementCount: 0,
        lastLogin: 0,
        registerTime: Date.now()
      });
      message.success('用户添加成功');
      submitting.value = false;
      showAddUserModal.value = false;
      
      // 重置表单
      addUserForm.uid = '';
      addUserForm.username = '';
      addUserForm.email = '';
      addUserForm.college = '';
      addUserForm.grade = '';
      addUserForm.class = '';
    }, 500);
  };

  // 导入Excel
  const handleImport = async () => {
    if (!importForm.file) {
      message.warning('请选择要导入的文件');
      return;
    }
    submitting.value = true;
    
    //TODO: 调用 POST /api/users/import 导入用户
    console.log('API: POST /api/users/import - 上传Excel文件', importForm.file);
    
    setTimeout(() => {
      message.success('用户导入成功');
      submitting.value = false;
      showImportModal.value = false;
      importForm.file = null;
    }, 1000);
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    //TODO: 调用 GET /api/users/import/template 下载Excel模板
    console.log('API: GET /api/users/import/template - 下载Excel模板');
    message.info('模板下载功能开发中...');
  };

  // 打开添加用户模态框
  const openAddUserModal = async () => {
    await fetchColleges();
    showAddUserModal.value = true;
  };

  // 重置筛选
  const resetFilters = () => {
    filters.keyword = '';
    filters.email = '';
    filters.role = null;
    filters.status = null;
    filters.registerTimeRange = null;
    filters.college = '';
    filters.grade = '';
    filters.class = '';
  };

  return {
    loading,
    submitting,
    userList,
    filteredUserList,
    selectedUserIds,
    filters,
    showEditModal,
    showPasswordModal,
    showTransferModal,
    showAchievementModal,
    showIpModal,
    showBatchCreateModal,
    showAddUserModal,
    showImportModal,
    editForm,
    passwordForm,
    transferForm,
    achievementForm,
    ipForm,
    addUserForm,
    importForm,
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
  };
}
