import { ref, reactive } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { normalizeRoles, primaryRole, type Role } from '@/types/user';
import {
  addUserAchievement,
  batchDeleteUsers,
  batchDisableUsers,
  batchEnableUsers,
  checkUser,
  createUser,
  deleteUser,
  deleteUserAchievement,
  downloadUserImportTemplate,
  getClasses,
  getClassTas,
  getClassTeachers,
  getColleges,
  getGrades,
  getUserAchievements,
  getUserDetail,
  getUsers,
  importUsers,
  updateUser,
  updateUserPassword,
  type ClassStaffVo,
  type UserDetailVo,
  type UserImportResultVo,
  type UserListVo,
} from '@/utils/api';
import { saveBlob } from '@/utils/download';

// 后端 UserStatusConstant
export const USER_STATUS = {
  NORMAL: 0,
  DISABLED: 1,
} as const;

// 用户数据接口（对应后端 UserListVo）
export interface UserItem {
  uid: string;
  username: string;
  realname: string;
  avatar: string;
  collegeId: number | null;
  college: string;
  grade: string;
  classId: number | null;
  majorClass: string;
  status: number;
  roles: string[];
  primaryRole: Role;
}

export function toUserItem(vo: UserListVo): UserItem {
  const roles = vo.roles ?? [];
  return {
    uid: vo.uid,
    username: vo.username ?? '',
    realname: vo.realname ?? '',
    avatar: vo.avatar ?? '',
    collegeId: vo.collegeId ?? null,
    college: vo.college ?? '',
    grade: vo.grade ?? '',
    classId: vo.classId ?? null,
    majorClass: vo.majorClass ?? '',
    status: vo.status ?? USER_STATUS.NORMAL,
    roles,
    primaryRole: primaryRole(normalizeRoles(roles)),
  };
}

// 用户成就（对应后端 UserAchievementVo）
export interface Achievement {
  id: number;
  title: string;
  content: string;
  proofUrl: string;
  achieveTime: number;
  status: number | null;
}

interface SelectOption<T> {
  label: string;
  value: T;
}

export function useUserManage() {
  const message = useMessage();
  const dialog = useDialog();

  const loading = ref(false);
  const submitting = ref(false);
  // 不可逆写操作的独立在途状态：与列表 loading 分离，避免「列表读取中确认删除」被静默拦截，
  // 也避免列表请求结束清除写操作的加载态。
  const mutating = ref(false);
  const checking = ref(false);

  // 模态框状态
  const showEditModal = ref(false);
  const showPasswordModal = ref(false);
  const showAchievementModal = ref(false);
  const showAddUserModal = ref(false);
  const showImportModal = ref(false);
  const showDetailModal = ref(false);
  const detailLoading = ref(false);
  const detail = ref<UserDetailVo | null>(null);

  // 筛选条件（仅保留后端 /api/user/users 真正支持的字段）
  const filters = reactive<{
    keyword: string;
    collegeId: number | null;
    grade: string;
    classId: number | null;
  }>({
    keyword: '',
    collegeId: null,
    grade: '',
    classId: null,
  });

  const userList = ref<UserItem[]>([]);
  const selectedUserIds = ref<string[]>([]);

  const pagination = reactive({
    page: 1,
    pageSize: 15,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 15, 20, 30, 50],
    onChange: (page: number) => {
      pagination.page = page;
      void fetchUsers();
    },
    onUpdatePageSize: (size: number) => {
      pagination.pageSize = size;
      pagination.page = 1;
      void fetchUsers();
    },
  });

  // 学院列表（全局）
  const collegeOptions = ref<SelectOption<number>[]>([]);
  // 筛选 / 编辑 / 新增 各自的年级、班级选项，避免互相串值
  const filterGradeOptions = ref<SelectOption<string>[]>([]);
  const filterClassOptions = ref<SelectOption<number>[]>([]);
  const editGradeOptions = ref<SelectOption<string>[]>([]);
  const editClassOptions = ref<SelectOption<number>[]>([]);
  const addGradeOptions = ref<SelectOption<string>[]>([]);
  const addClassOptions = ref<SelectOption<number>[]>([]);

  // 选中班级后的只读师资（教师/助教），班级变更作废旧请求
  const classTeachers = ref<ClassStaffVo[]>([]);
  const classTas = ref<ClassStaffVo[]>([]);
  const classStaffLoading = ref(false);
  const classStaffError = ref<string | null>(null);
  let classStaffSeq = 0;

  // 编辑表单
  const editForm = reactive({
    uid: '',
    username: '',
    email: '',
    status: USER_STATUS.NORMAL as number,
    collegeId: null as number | null,
    grade: '',
    classId: null as number | null,
  });

  // 添加用户表单
  const addUserForm = reactive({
    uid: '',
    username: '',
    email: '',
    password: '',
    collegeId: null as number | null,
    grade: '',
    classId: null as number | null,
  });

  // 密码表单
  const passwordForm = reactive({
    uid: '',
    username: '',
    newPassword: '',
  });

  // 成就表单
  const achievementForm = reactive({
    uid: '',
    username: '',
    achievements: [] as Achievement[],
    newTitle: '',
    newContent: '',
    newProofUrl: '',
    newDate: null as number | null,
  });

  // 导入：文件与结果只保留在当前弹窗会话内，关闭即清理（初始密码不落任何持久化）
  const importFile = ref<File | null>(null);
  const importResult = ref<UserImportResultVo | null>(null);

  const fetchColleges = async () => {
    collegeOptions.value = ((await getColleges()) ?? []).map((item) => ({
      label: item.name,
      value: item.id,
    }));
  };

  const fetchGrades = async (collegeId: number): Promise<SelectOption<string>[]> => {
    return ((await getGrades(collegeId)) ?? []).map((item) => ({
      label: item.grade,
      value: item.grade,
    }));
  };

  const fetchClasses = async (
    collegeId: number,
    grade: string,
  ): Promise<SelectOption<number>[]> => {
    return ((await getClasses(collegeId, grade)) ?? []).map((item) => ({
      label: item.name,
      value: item.id,
    }));
  };

  // ---- 用户列表 ----
  // 请求序号：迟到的旧响应不得覆盖新筛选/新分页的结果
  let listSeq = 0;

  const fetchUsers = async () => {
    const current = ++listSeq;
    loading.value = true;
    try {
      const data = await getUsers({
        keyword: filters.keyword,
        collegeId: filters.collegeId,
        grade: filters.grade || null,
        classId: filters.classId,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      if (current !== listSeq) return;
      userList.value = (data?.list ?? []).map(toUserItem);
      pagination.itemCount = data?.total ?? 0;
    } catch (err) {
      if (current !== listSeq) return;
      userList.value = [];
      pagination.itemCount = 0;
      message.error(err instanceof Error ? err.message : '加载用户列表失败');
    } finally {
      if (current === listSeq) loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    void fetchUsers();
  };

  // ---- 筛选区学院/年级联动（局部序号作废旧响应） ----
  let filterGradeSeq = 0;
  let filterClassSeq = 0;

  const resetFilters = () => {
    filters.keyword = '';
    filters.collegeId = null;
    filters.grade = '';
    filters.classId = null;
    filterGradeOptions.value = [];
    filterClassOptions.value = [];
    // 作废在途的年级/班级请求，避免旧响应覆盖重置后的空选项
    ++filterGradeSeq;
    ++filterClassSeq;
    pagination.page = 1;
    void fetchUsers();
  };

  const handleFilterCollegeChange = async (value: number | null) => {
    filters.grade = '';
    filters.classId = null;
    filterGradeOptions.value = [];
    filterClassOptions.value = [];
    // 学院变更后旧的班级请求失效（年级请求由下面的 seq 作废）
    ++filterClassSeq;
    const seq = ++filterGradeSeq;
    if (!value) {
      filterGradeOptions.value = [];
      return;
    }
    try {
      const options = await fetchGrades(value);
      if (seq !== filterGradeSeq) return;
      filterGradeOptions.value = options;
    } catch (err) {
      if (seq !== filterGradeSeq) return;
      filterGradeOptions.value = [];
      message.error(err instanceof Error ? err.message : '加载年级失败');
    }
  };

  const handleFilterGradeChange = async (value: string | null) => {
    filters.classId = null;
    filterClassOptions.value = [];
    const seq = ++filterClassSeq;
    if (!value || !filters.collegeId) {
      filterClassOptions.value = [];
      return;
    }
    try {
      const options = await fetchClasses(filters.collegeId, value);
      if (seq !== filterClassSeq) return;
      filterClassOptions.value = options;
    } catch (err) {
      if (seq !== filterClassSeq) return;
      filterClassOptions.value = [];
      message.error(err instanceof Error ? err.message : '加载班级失败');
    }
  };

  // ---- 编辑表单联动 ----
  let editGradeSeq = 0;
  let editClassSeq = 0;

  const handleEditCollegeChange = async (value: number | null) => {
    editForm.grade = '';
    editForm.classId = null;
    editGradeOptions.value = [];
    editClassOptions.value = [];
    void loadClassStaff(null);
    // 学院变更后旧的班级请求失效（年级请求由下面的 seq 作废）
    ++editClassSeq;
    const seq = ++editGradeSeq;
    if (!value) {
      editGradeOptions.value = [];
      return;
    }
    try {
      const options = await fetchGrades(value);
      if (seq !== editGradeSeq) return;
      editGradeOptions.value = options;
    } catch (err) {
      if (seq !== editGradeSeq) return;
      editGradeOptions.value = [];
      message.error(err instanceof Error ? err.message : '加载年级失败');
    }
  };

  const handleEditGradeChange = async (value: string | null) => {
    editForm.classId = null;
    editClassOptions.value = [];
    void loadClassStaff(null);
    const seq = ++editClassSeq;
    if (!value || !editForm.collegeId) {
      editClassOptions.value = [];
      return;
    }
    try {
      const options = await fetchClasses(editForm.collegeId, value);
      if (seq !== editClassSeq) return;
      editClassOptions.value = options;
    } catch (err) {
      if (seq !== editClassSeq) return;
      editClassOptions.value = [];
      message.error(err instanceof Error ? err.message : '加载班级失败');
    }
  };

  const handleEditClassChange = (value: number | null): Promise<void> => {
    return loadClassStaff(value);
  };

  // ---- 新增表单联动 ----
  let addGradeSeq = 0;
  let addClassSeq = 0;

  const handleAddCollegeChange = async (value: number | null) => {
    addUserForm.grade = '';
    addUserForm.classId = null;
    addGradeOptions.value = [];
    addClassOptions.value = [];
    void loadClassStaff(null);
    // 学院变更后旧的班级请求失效（年级请求由下面的 seq 作废）
    ++addClassSeq;
    const seq = ++addGradeSeq;
    if (!value) {
      addGradeOptions.value = [];
      return;
    }
    try {
      const options = await fetchGrades(value);
      if (seq !== addGradeSeq) return;
      addGradeOptions.value = options;
    } catch (err) {
      if (seq !== addGradeSeq) return;
      addGradeOptions.value = [];
      message.error(err instanceof Error ? err.message : '加载年级失败');
    }
  };

  const handleAddGradeChange = async (value: string | null) => {
    addUserForm.classId = null;
    addClassOptions.value = [];
    void loadClassStaff(null);
    const seq = ++addClassSeq;
    if (!value || !addUserForm.collegeId) {
      addClassOptions.value = [];
      return;
    }
    try {
      const options = await fetchClasses(addUserForm.collegeId, value);
      if (seq !== addClassSeq) return;
      addClassOptions.value = options;
    } catch (err) {
      if (seq !== addClassSeq) return;
      addClassOptions.value = [];
      message.error(err instanceof Error ? err.message : '加载班级失败');
    }
  };

  const handleAddClassChange = (value: number | null): Promise<void> => {
    return loadClassStaff(value);
  };

  // ---- 班级教师/助教（只读，真实 API；旧班级请求作废） ----
  const loadClassStaff = async (classId: number | null) => {
    const seq = ++classStaffSeq;
    classStaffError.value = null;
    if (!classId) {
      classTeachers.value = [];
      classTas.value = [];
      classStaffLoading.value = false;
      return;
    }
    classStaffLoading.value = true;
    try {
      const [teachers, tas] = await Promise.all([getClassTeachers(classId), getClassTas(classId)]);
      if (seq !== classStaffSeq) return;
      classTeachers.value = teachers ?? [];
      classTas.value = tas ?? [];
    } catch (err) {
      if (seq !== classStaffSeq) return;
      classTeachers.value = [];
      classTas.value = [];
      classStaffError.value = err instanceof Error ? err.message : '加载班级师资失败';
    } finally {
      if (seq === classStaffSeq) classStaffLoading.value = false;
    }
  };

  // ---- 编辑 ----
  const openEditModal = async (user: UserItem) => {
    editForm.uid = user.uid;
    editForm.username = user.username;
    // UserListVo/UserDetailVo 均不返回 email，留空表示不修改
    editForm.email = '';
    editForm.status = user.status;
    editForm.collegeId = user.collegeId;
    editForm.grade = user.grade;
    editForm.classId = user.classId;
    editGradeOptions.value = [];
    editClassOptions.value = [];
    classTeachers.value = [];
    classTas.value = [];
    classStaffError.value = null;
    // 打开表单时作废上一次在途的年级/班级/师资请求，避免继承旧响应
    const gradeSeq = ++editGradeSeq;
    const classSeq = ++editClassSeq;
    ++classStaffSeq;

    try {
      await fetchColleges();
      if (user.collegeId) {
        const gradeOptions = await fetchGrades(user.collegeId);
        // 快速连点两个用户时，A 的响应不得落到 B 的表单上
        if (gradeSeq !== editGradeSeq) return;
        editGradeOptions.value = gradeOptions;
      }
      if (user.collegeId && user.grade) {
        const classOptions = await fetchClasses(user.collegeId, user.grade);
        if (classSeq !== editClassSeq) return;
        editClassOptions.value = classOptions;
      }
    } catch (err) {
      if (gradeSeq !== editGradeSeq) return;
      message.error(err instanceof Error ? err.message : '加载学院/年级/班级失败');
    }
    if (gradeSeq !== editGradeSeq) return;
    if (user.classId) {
      void loadClassStaff(user.classId);
    }
    showEditModal.value = true;
  };

  const handleEditSubmit = async () => {
    if (!editForm.uid || !editForm.username.trim()) {
      message.warning('UID、用户名不能为空');
      return;
    }
    submitting.value = true;
    try {
      await updateUser(editForm.uid, {
        username: editForm.username.trim(),
        // 邮箱留空则不改（后端 DTO 中 email 可选）
        email: editForm.email.trim() || undefined,
        status: editForm.status,
        collegeId: editForm.collegeId,
        classId: editForm.classId,
        grade: editForm.grade || undefined,
      });
      message.success('更新成功');
      showEditModal.value = false;
      await fetchUsers();
    } catch (err) {
      // 失败保留表单，显示真实错误
      message.error(err instanceof Error ? err.message : '更新用户失败');
    } finally {
      submitting.value = false;
    }
  };

  // ---- 密码 ----
  // 与后端 hnieoj-user.yaml 的 password-min-length / password-max-length 保持一致
  const PASSWORD_MIN_LENGTH = 6;
  const PASSWORD_MAX_LENGTH = 32;

  const openPasswordModal = (user: UserItem) => {
    passwordForm.uid = user.uid;
    passwordForm.username = user.username;
    passwordForm.newPassword = '';
    showPasswordModal.value = true;
  };

  const handlePasswordSubmit = async () => {
    const passwordLength = passwordForm.newPassword.length;
    if (passwordLength < PASSWORD_MIN_LENGTH || passwordLength > PASSWORD_MAX_LENGTH) {
      message.warning(`密码长度应在 ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} 位之间`);
      return;
    }
    submitting.value = true;
    try {
      await updateUserPassword(passwordForm.uid, passwordForm.newPassword);
      message.success('密码修改成功');
      showPasswordModal.value = false;
    } catch (err) {
      message.error(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      submitting.value = false;
    }
  };

  // ---- 用户详情（按 uid 真实读取） ----
  // 详情请求序号：快速连点两个用户时，先发起的响应不得覆盖后选的用户
  let detailSeq = 0;

  const openDetailModal = async (user: UserItem) => {
    const current = ++detailSeq;
    detail.value = null;
    showDetailModal.value = true;
    detailLoading.value = true;
    try {
      const data = await getUserDetail(user.uid);
      if (current !== detailSeq) return;
      detail.value = data;
    } catch (err) {
      if (current !== detailSeq) return;
      message.error(err instanceof Error ? err.message : '加载用户详情失败');
    } finally {
      if (current === detailSeq) detailLoading.value = false;
    }
  };

  // ---- 用户查验 ----
  const handleCheckUser = async (uid: string) => {
    if (!uid) return;
    checking.value = true;
    try {
      const result = await checkUser(uid);
      if (result?.exists) {
        message.success(`用户存在：${result.uid ?? uid}（${result.username ?? '-'}）`);
      } else {
        message.warning(`未找到用户：${uid}`);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '用户查验失败');
    } finally {
      checking.value = false;
    }
  };

  // ---- 删除 / 批量 ----
  const handleDelete = (user: UserItem) => {
    dialog.warning({
      title: '删除确认',
      content: `确定要删除用户 "${user.username}" (${user.uid}) 吗？此操作不可恢复。`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起不可逆请求；使用独立 mutation 状态而非列表 loading
        if (mutating.value) return false;
        mutating.value = true;
        try {
          await deleteUser(user.uid);
          message.success('用户已删除');
          await fetchUsers();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除用户失败');
        } finally {
          mutating.value = false;
        }
      },
    });
  };

  const handleBatchDisable = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    const uids = [...selectedUserIds.value];
    dialog.warning({
      title: '批量禁用确认',
      content: `确定要禁用选中的 ${uids.length} 个用户吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起不可逆请求；使用独立 mutation 状态而非列表 loading
        if (mutating.value) return false;
        mutating.value = true;
        try {
          await batchDisableUsers(uids);
          message.success(`已禁用 ${uids.length} 个用户`);
          selectedUserIds.value = [];
          await fetchUsers();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '批量禁用失败');
        } finally {
          mutating.value = false;
        }
      },
    });
  };

  const handleBatchEnable = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    const uids = [...selectedUserIds.value];
    dialog.info({
      title: '批量激活确认',
      content: `确定要激活选中的 ${uids.length} 个用户吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起不可逆请求；使用独立 mutation 状态而非列表 loading
        if (mutating.value) return false;
        mutating.value = true;
        try {
          await batchEnableUsers(uids);
          message.success(`已激活 ${uids.length} 个用户`);
          selectedUserIds.value = [];
          await fetchUsers();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '批量激活失败');
        } finally {
          mutating.value = false;
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedUserIds.value.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    const uids = [...selectedUserIds.value];
    dialog.error({
      title: '批量删除确认',
      content: `确定要删除选中的 ${uids.length} 个用户吗？此操作不可恢复！`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起不可逆请求；使用独立 mutation 状态而非列表 loading
        if (mutating.value) return false;
        mutating.value = true;
        try {
          await batchDeleteUsers(uids);
          message.success(`已删除 ${uids.length} 个用户`);
          selectedUserIds.value = [];
          await fetchUsers();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '批量删除失败');
        } finally {
          mutating.value = false;
        }
      },
    });
  };

  // ---- 新增用户 ----
  const openAddUserModal = async () => {
    addUserForm.uid = '';
    addUserForm.username = '';
    addUserForm.email = '';
    addUserForm.password = '';
    addUserForm.collegeId = null;
    addUserForm.grade = '';
    addUserForm.classId = null;
    addGradeOptions.value = [];
    addClassOptions.value = [];
    classTeachers.value = [];
    classTas.value = [];
    classStaffError.value = null;
    // 打开表单时作废上一次在途的年级/班级/师资请求，避免继承旧响应
    ++addGradeSeq;
    ++addClassSeq;
    ++classStaffSeq;
    try {
      await fetchColleges();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载学院失败');
    }
    showAddUserModal.value = true;
  };

  const handleAddUser = async () => {
    if (!addUserForm.uid.trim() || !addUserForm.username.trim()) {
      message.warning('UID、用户名不能为空');
      return;
    }
    submitting.value = true;
    try {
      const result = await createUser({
        uid: addUserForm.uid.trim(),
        username: addUserForm.username.trim(),
        email: addUserForm.email.trim() || undefined,
        // 不传密码则由后端生成初始密码
        password: addUserForm.password || undefined,
        collegeId: addUserForm.collegeId,
        classId: addUserForm.classId,
        grade: addUserForm.grade || undefined,
      });
      message.success('用户添加成功');
      if (result?.initialPassword) {
        dialog.info({
          title: '初始密码',
          content: `用户 ${result.uid} 的初始密码：${result.initialPassword}（请立即告知用户）`,
          positiveText: '知道了',
        });
      }
      showAddUserModal.value = false;
      await fetchUsers();
    } catch (err) {
      // 失败保留表单，显示真实错误
      message.error(err instanceof Error ? err.message : '添加用户失败');
    } finally {
      submitting.value = false;
    }
  };

  // ---- 导入模板（真实下载） ----
  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadUserImportTemplate();
      saveBlob(blob, 'user-import-template.xlsx');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '模板下载失败');
    }
  };

  // ---- 导入用户（真实上传 POST /api/users/import） ----
  const IMPORT_FILE_EXTENSIONS = ['.xls', '.xlsx'];

  const resetImportState = () => {
    importFile.value = null;
    importResult.value = null;
  };

  const openImportModal = () => {
    // 新一次打开不沿用上一次的文件与结果（含初始密码）
    resetImportState();
    showImportModal.value = true;
  };

  /** n-modal 关闭动画结束后兜底清理：覆盖右上角关闭/Esc 等非按钮关闭路径 */
  const handleImportModalAfterLeave = () => {
    resetImportState();
  };

  /**
   * 校验并暂存待导入文件。
   * 空选择/空文件/错误后缀一律拒绝并返回 false，调用方不得发起请求。
   */
  const handleImportFileChange = (file: File | null): boolean => {
    // 导入在途不得更换文件
    if (submitting.value) return false;
    // 待导入文件始终只有一份：被拒/移除后不留旧选择（结果保留到下次导入或关闭弹窗）
    importFile.value = null;
    if (!file) return false;
    const name = file.name.toLowerCase();
    if (!IMPORT_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      message.warning('仅支持 .xls / .xlsx 格式的 Excel 文件');
      return false;
    }
    if (file.size === 0) {
      message.warning('文件内容为空，请重新选择');
      return false;
    }
    importFile.value = file;
    return true;
  };

  /** 关闭导入弹窗；导入在途禁止关闭（结果未落定且初始密码仍需人工记录） */
  const closeImportModal = (): boolean => {
    if (submitting.value) return false;
    showImportModal.value = false;
    resetImportState();
    return true;
  };

  const handleImport = async () => {
    // 沿用现有提交锁：在途时重复点击不再发请求
    if (submitting.value) return;
    const file = importFile.value;
    if (!file) {
      message.warning('请先选择要导入的 Excel 文件');
      return;
    }
    submitting.value = true;
    importResult.value = null;
    try {
      const result = await importUsers(file);
      importResult.value = result;
      const success = result?.successCount ?? 0;
      const failed = result?.failedCount ?? 0;
      if (failed > 0 && success > 0) {
        message.warning(`部分成功：成功 ${success} 条，失败 ${failed} 条，请只修正失败行后再上传`);
      } else if (failed > 0) {
        message.error(`导入失败：成功 0 条，失败 ${failed} 条，请修正失败行后再上传`);
      } else {
        message.success(`导入成功 ${success} 条`);
      }
      // 后端已返回结果：清空原文件，避免整份原文件被再次提交导致成功行重复导入
      importFile.value = null;
      if (success > 0) {
        await fetchUsers();
      }
    } catch (err) {
      // HTTP/网络失败：保留已选文件与真实错误以便重试，且不显示任何成功结果
      message.error(err instanceof Error ? err.message : '导入用户失败');
    } finally {
      submitting.value = false;
    }
  };

  // ---- 用户成就 ----
  const fetchAchievements = async () => {
    const data = await getUserAchievements(achievementForm.uid, 1, 100);
    achievementForm.achievements = (data?.list ?? []).map((item) => ({
      id: item.id,
      title: item.title ?? '',
      content: item.content ?? '',
      proofUrl: item.proofUrl ?? '',
      achieveTime: item.achieveTime ?? 0,
      status: item.status,
    }));
  };

  const openAchievementModal = async (user: UserItem) => {
    achievementForm.uid = user.uid;
    achievementForm.username = user.username;
    achievementForm.achievements = [];
    achievementForm.newTitle = '';
    achievementForm.newContent = '';
    achievementForm.newProofUrl = '';
    achievementForm.newDate = null;
    showAchievementModal.value = true;
    try {
      await fetchAchievements();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载用户成就失败');
    }
  };

  const handleAddAchievement = async () => {
    if (!achievementForm.newContent.trim()) {
      message.warning('请输入成就内容');
      return;
    }
    submitting.value = true;
    try {
      await addUserAchievement(achievementForm.uid, {
        title: achievementForm.newTitle.trim() || undefined,
        content: achievementForm.newContent.trim(),
        proofUrl: achievementForm.newProofUrl.trim() || undefined,
        achieveTime: achievementForm.newDate ?? undefined,
      });
      achievementForm.newTitle = '';
      achievementForm.newContent = '';
      achievementForm.newProofUrl = '';
      achievementForm.newDate = null;
      message.success('成就添加成功');
      await fetchAchievements();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '添加成就失败');
    } finally {
      submitting.value = false;
    }
  };

  const handleDeleteAchievement = (id: number) => {
    dialog.warning({
      title: '删除成就',
      content: '确定删除该成就吗？',
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起删除请求
        if (mutating.value) return false;
        mutating.value = true;
        try {
          await deleteUserAchievement(achievementForm.uid, id);
          message.success('成就删除成功');
          await fetchAchievements();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除成就失败');
        } finally {
          mutating.value = false;
        }
      },
    });
  };

  return {
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
  };
}
