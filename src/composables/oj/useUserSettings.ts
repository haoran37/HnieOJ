import { reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  changeUserPassword,
  getClasses,
  getColleges,
  getGrades,
  getMyProfileChangeRequests,
  getProfile,
  submitProfileChangeRequest,
  updateUserProfile,
  type ProfileChangePayload,
  type ProfileChangeVo,
  type UserProfileUpdatePayload,
} from '@/utils/api';
import type { UserProfile } from '@/types/user';

interface SelectOption<T> {
  label: string;
  value: T;
}

const USERNAME_MIN = 2;
const USERNAME_MAX = 20;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 32;

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** 头像：空串表示清除可选项；非空时仅允许 http(s) 绝对地址或 / 开头的站内路径；拒绝 javascript:/data:/协议相对 // */
export function isValidAvatar(value: string): boolean {
  if (!value) return true;
  if (value.length > 500) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/')) return true;
  return isHttpUrl(value);
}

export interface UseUserSettingsOptions {
  /** 返回 false 时禁止任何请求，用于确保不加载/提交他人资料 */
  isActive?: () => boolean;
}

/**
 * 本人自助资料 / 密码 / 资料变更申请（身份与联系/社交字段走同一个审批流程）。
 *
 * - 普通资料只提交白名单字段；uid/email 只读；
 * - 密码独立表单，不 trim，成功由调用方清理会话并跳转登录；
 * - 身份变更走真实学院/年级/班级级联与 POST 申请，仅本人；pending 时禁重复申请；
 * - 旧账号/旧响应通过请求序号作废，绝不用他人资料填充本人表单；
 * - isActive() 为 false（非本人页面）时任何方法都不发请求。
 */
export function useUserSettings(options: UseUserSettingsOptions = {}) {
  const message = useMessage();
  const active = () => options.isActive?.() ?? true;
  // generation：账号/路由切换时递增，作废在途 mutation 的后续副作用（重载/退出/刷新）
  let generation = 0;

  // ---------------- 普通资料 ----------------
  const profileLoading = ref(false);
  const profileError = ref<string | null>(null);
  const profileLoaded = ref(false);
  const savingProfile = ref(false);

  const profile = reactive({
    uid: '',
    email: '',
    username: '',
    avatar: '',
    qq: '',
    phone: '',
    cfUsername: '',
    github: '',
    blog: '',
    realname: '',
    college: '',
    class: '',
    grade: '',
    collegeId: null as number | null,
    classId: null as number | null,
  });

  let profileSeq = 0;

  const applyProfile = (data: UserProfile) => {
    profile.uid = data.uid ?? '';
    profile.email = data.email ?? '';
    profile.username = data.username ?? '';
    profile.avatar = data.avatar ?? '';
    profile.qq = data.qq ?? '';
    profile.phone = data.phone ?? '';
    profile.cfUsername = data.cf_username ?? '';
    profile.github = data.github ?? '';
    profile.blog = data.blog ?? '';
    profile.realname = data.realname ?? '';
    profile.college = data.college ?? '';
    profile.class = data.class ?? '';
    profile.grade = data.grade ?? '';
    profile.collegeId = data.collegeId ?? null;
    profile.classId = data.classId ?? null;
    // 身份申请以当前资料为默认起点
    identity.realname = profile.realname;
    identity.collegeId = profile.collegeId;
    identity.grade = profile.grade;
    identity.classId = profile.classId;
    profileLoaded.value = true;
  };

  const loadProfile = async () => {
    if (!active()) return;
    const seq = ++profileSeq;
    profileLoading.value = true;
    profileError.value = null;
    try {
      const data = await getProfile();
      if (seq !== profileSeq) return;
      applyProfile(data);
    } catch (err) {
      if (seq !== profileSeq) return;
      profileError.value = err instanceof Error ? err.message : '资料加载失败';
    } finally {
      if (seq === profileSeq) profileLoading.value = false;
    }
  };

  const buildProfilePayload = (): UserProfileUpdatePayload => ({
    // 只发送白名单字段，绝不携带 uid/email/身份字段；空串表示清除可选项
    username: profile.username.trim(),
    avatar: profile.avatar.trim(),
    qq: profile.qq.trim(),
    github: profile.github.trim(),
    blog: profile.blog.trim(),
  });

  const validateProfile = (): string | null => {
    // 与 payload 一致：可选项先 trim，空串视为清除，再校验非空值
    const username = profile.username.trim();
    const avatar = profile.avatar.trim();
    const qq = profile.qq.trim();
    const github = profile.github.trim();
    const blog = profile.blog.trim();
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      return `用户名长度应在 ${USERNAME_MIN}-${USERNAME_MAX} 之间`;
    }
    if (!isValidAvatar(avatar)) {
      return '头像仅支持 http(s) 链接或以 / 开头的站内路径（长度不超过 500）';
    }
    if (qq && !/^\d{5,11}$/.test(qq)) {
      return 'QQ 应为 5-11 位数字';
    }
    if (github && (!isHttpUrl(github) || github.length > 255)) {
      return 'GitHub 仅支持 http(s) 链接且长度不超过 255';
    }
    if (blog && (!isHttpUrl(blog) || blog.length > 255)) {
      return '博客仅支持 http(s) 链接且长度不超过 255';
    }
    return null;
  };

  const saveProfile = async (): Promise<boolean> => {
    if (!active()) return false;
    if (savingProfile.value) return false;
    if (!profileLoaded.value) {
      message.warning('资料尚未加载完成');
      return false;
    }
    const invalid = validateProfile();
    if (invalid) {
      message.warning(invalid);
      return false;
    }
    const gen = generation;
    savingProfile.value = true;
    try {
      await updateUserProfile(buildProfilePayload());
      if (gen !== generation || !active()) return false;
      // 成功后重新读取真实 profile，确保展示的是服务端真实值
      await loadProfile();
      if (gen !== generation || !active()) return false;
      message.success('资料已保存');
      return true;
    } catch (err) {
      if (gen !== generation || !active()) return false;
      // 失败保留表单输入
      message.error(err instanceof Error ? err.message : '保存失败，请重试');
      return false;
    } finally {
      if (gen === generation) savingProfile.value = false;
    }
  };

  // ---------------- 密码 ----------------
  const changingPassword = ref(false);
  const passwordForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const clearPasswordForm = () => {
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  };

  const submitPassword = async (): Promise<boolean> => {
    if (!active()) return false;
    if (changingPassword.value) return false;
    if (!passwordForm.oldPassword) {
      message.warning('请输入当前密码');
      return false;
    }
    if (
      passwordForm.newPassword.length < PASSWORD_MIN ||
      passwordForm.newPassword.length > PASSWORD_MAX
    ) {
      message.warning(`新密码长度应在 ${PASSWORD_MIN}-${PASSWORD_MAX} 之间`);
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      message.warning('两次输入的新密码不一致');
      return false;
    }
    const gen = generation;
    changingPassword.value = true;
    try {
      // 密码不做 trim，原样提交
      await changeUserPassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      // 账号已切换：旧请求的成功结果不得让调用方退出新账号，也不得清空新表单
      if (gen !== generation || !active()) return false;
      clearPasswordForm();
      message.success('密码修改成功，请重新登录');
      return true;
    } catch (err) {
      if (gen !== generation || !active()) return false;
      // 失败保留输入，但不回显任何密码内容；旧密码错误不会导致退出登录
      message.error(err instanceof Error ? err.message : '密码修改失败，请重试');
      return false;
    } finally {
      if (gen === generation) changingPassword.value = false;
    }
  };

  // ---------------- 资料变更申请（合并后的唯一资料变更流程） ----------------
  const identity = reactive({
    realname: '',
    collegeId: null as number | null,
    grade: '',
    classId: null as number | null,
    reason: '',
    // 联系/社交字段：留空表示本次不修改该字段
    email: '',
    phone: '',
    qq: '',
    cfUsername: '',
    github: '',
    blog: '',
  });
  const identityCollegeOptions = ref<SelectOption<number>[]>([]);
  const identityGradeOptions = ref<SelectOption<string>[]>([]);
  const identityClassOptions = ref<SelectOption<number>[]>([]);
  const submittingIdentity = ref(false);

  let identityGradeSeq = 0;
  let identityClassSeq = 0;

  const loadIdentityColleges = async () => {
    if (!active()) return;
    if (identityCollegeOptions.value.length > 0) return;
    try {
      const colleges = await getColleges();
      identityCollegeOptions.value = (Array.isArray(colleges) ? colleges : []).map((item) => ({
        label: item.name,
        value: item.id,
      }));
    } catch (err) {
      message.error(err instanceof Error ? err.message : '学院加载失败');
    }
  };

  const handleIdentityCollegeChange = async (value: number | null) => {
    if (!active()) return;
    identity.collegeId = value;
    identity.grade = '';
    identity.classId = null;
    identityGradeOptions.value = [];
    identityClassOptions.value = [];
    ++identityClassSeq;
    const seq = ++identityGradeSeq;
    if (!value) return;
    try {
      const grades = await getGrades(value);
      const options = (Array.isArray(grades) ? grades : []).map((item) => ({
        label: item.grade,
        value: item.grade,
      }));
      if (seq !== identityGradeSeq) return;
      identityGradeOptions.value = options;
    } catch (err) {
      if (seq !== identityGradeSeq) return;
      identityGradeOptions.value = [];
      message.error(err instanceof Error ? err.message : '年级加载失败');
    }
  };

  const handleIdentityGradeChange = async (value: string | null) => {
    if (!active()) return;
    identity.grade = value || '';
    identity.classId = null;
    identityClassOptions.value = [];
    const seq = ++identityClassSeq;
    if (!value || !identity.collegeId) return;
    try {
      const classes = await getClasses(identity.collegeId, value);
      const options = (Array.isArray(classes) ? classes : []).map((item) => ({
        label: item.name,
        value: item.id,
      }));
      if (seq !== identityClassSeq) return;
      identityClassOptions.value = options;
    } catch (err) {
      if (seq !== identityClassSeq) return;
      identityClassOptions.value = [];
      message.error(err instanceof Error ? err.message : '班级加载失败');
    }
  };

  const myRequests = ref<ProfileChangeVo[]>([]);
  const requestsLoading = ref(false);
  const requestsError = ref<string | null>(null);
  const requestsTotal = ref(0);
  const requestsPage = ref(1);
  const requestsPageSize = ref(5);
  const hasPending = ref(false);

  let requestsSeq = 0;
  let pendingSeq = 0;

  // 仅用于判断是否存在待审申请（页面本身不展示这 100 条）
  const detectPending = async () => {
    if (!active()) return;
    const seq = ++pendingSeq;
    try {
      const data = await getMyProfileChangeRequests(1, 100);
      if (seq !== pendingSeq) return;
      hasPending.value = (data?.list ?? []).some((item) => item.status === 'PENDING');
    } catch {
      // 读取失败时保持上一次状态，由后端在提交时兜底冲突
    }
  };

  const fetchMyRequests = async () => {
    if (!active()) return;
    const seq = ++requestsSeq;
    requestsLoading.value = true;
    requestsError.value = null;
    try {
      const data = await getMyProfileChangeRequests(requestsPage.value, requestsPageSize.value);
      if (seq !== requestsSeq) return;
      myRequests.value = data?.list ?? [];
      requestsTotal.value = data?.total ?? 0;
    } catch (err) {
      if (seq !== requestsSeq) return;
      myRequests.value = [];
      requestsTotal.value = 0;
      requestsError.value = err instanceof Error ? err.message : '申请记录加载失败';
    } finally {
      if (seq === requestsSeq) requestsLoading.value = false;
    }
  };

  const handleRequestsPageChange = (page: number) => {
    requestsPage.value = page;
    void fetchMyRequests();
  };

  const handleRequestsPageSizeChange = (size: number) => {
    requestsPageSize.value = size;
    requestsPage.value = 1;
    void fetchMyRequests();
  };

  /** 与当前资料比对后，本次申请真正要改的字段（与后端 changedFields 口径一致） */
  const changedProfileFields = (): ProfileChangePayload | null => {
    const payload: ProfileChangePayload = { reason: identity.reason.trim() };
    const realname = identity.realname.trim();
    if (realname && realname !== profile.realname) payload.realname = realname;
    if (identity.collegeId != null && identity.collegeId !== profile.collegeId) {
      payload.collegeId = identity.collegeId;
    }
    if (identity.grade && identity.grade !== profile.grade) payload.grade = identity.grade;
    if (identity.classId != null && identity.classId !== profile.classId) {
      payload.classId = identity.classId;
    }
    if (identity.email.trim() && identity.email.trim() !== profile.email) {
      payload.email = identity.email.trim();
    }
    if (identity.phone.trim() && identity.phone.trim() !== profile.phone) {
      payload.phone = identity.phone.trim();
    }
    if (identity.qq.trim() && identity.qq.trim() !== profile.qq) payload.qq = identity.qq.trim();
    if (identity.cfUsername.trim() && identity.cfUsername.trim() !== profile.cfUsername) {
      payload.cfUsername = identity.cfUsername.trim();
    }
    if (identity.github.trim() && identity.github.trim() !== profile.github) {
      payload.github = identity.github.trim();
    }
    if (identity.blog.trim() && identity.blog.trim() !== profile.blog) {
      payload.blog = identity.blog.trim();
    }
    return Object.keys(payload).length > 1 ? payload : null;
  };

  const validateIdentity = (): string | null => {
    if (!identity.reason.trim()) return '请填写变更原因';
    if (identity.reason.trim().length > 1000) return '变更原因长度不能超过 1000';

    const payload = changedProfileFields();
    if (!payload) return '请至少修改一个字段后再提交';

    // 身份字段只要有一项要改，就要求四项齐全（后端同样按整体校验归属关系）
    const identityChanged =
      payload.realname !== undefined ||
      payload.collegeId !== undefined ||
      payload.grade !== undefined ||
      payload.classId !== undefined;
    if (identityChanged) {
      if (!identity.realname.trim()) return '请填写实名';
      if (identity.realname.trim().length > 50) return '实名长度不能超过 50';
      if (identity.collegeId == null) return '请选择学院';
      if (!identity.grade) return '请选择年级';
      if (identity.classId == null) return '请选择班级';
    }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return '邮箱格式不正确';
    return null;
  };

  const submitIdentity = async (): Promise<boolean> => {
    if (!active()) return false;
    if (submittingIdentity.value) return false;
    if (hasPending.value) {
      message.warning('已有待审核的变更申请，请等待处理后再提交');
      return false;
    }
    const invalid = validateIdentity();
    if (invalid) {
      message.warning(invalid);
      return false;
    }
    const payload = changedProfileFields();
    if (!payload) {
      message.warning('请至少修改一个字段后再提交');
      return false;
    }
    const gen = generation;
    submittingIdentity.value = true;
    try {
      await submitProfileChangeRequest(payload);
      if (gen !== generation || !active()) return false;
      message.success('变更申请已提交');
      identity.reason = '';
      identity.email = '';
      identity.phone = '';
      identity.qq = '';
      identity.cfUsername = '';
      identity.github = '';
      identity.blog = '';
      requestsPage.value = 1;
      await Promise.all([fetchMyRequests(), detectPending()]);
      return true;
    } catch (err) {
      if (gen !== generation || !active()) return false;
      // 失败保留填写内容（含原因）；冲突时刷新真实状态
      message.error(err instanceof Error ? err.message : '提交失败，请重试');
      await detectPending();
      return false;
    } finally {
      if (gen === generation) submittingIdentity.value = false;
    }
  };

  const loadAll = async () => {
    await Promise.all([loadProfile(), loadIdentityColleges(), fetchMyRequests(), detectPending()]);
  };

  // 切换他人 route / 账号：清空旧数据并作废在途读取与 mutation，绝不用他人资料填充本人表单
  const reset = () => {
    ++generation;
    ++profileSeq;
    ++requestsSeq;
    ++pendingSeq;
    ++identityGradeSeq;
    ++identityClassSeq;
    profileLoaded.value = false;
    profileError.value = null;
    profileLoading.value = false;
    savingProfile.value = false;
    changingPassword.value = false;
    submittingIdentity.value = false;
    requestsLoading.value = false;
    profile.uid = '';
    profile.email = '';
    profile.username = '';
    profile.avatar = '';
    profile.qq = '';
    profile.phone = '';
    profile.cfUsername = '';
    profile.github = '';
    profile.blog = '';
    profile.realname = '';
    profile.college = '';
    profile.class = '';
    profile.grade = '';
    profile.collegeId = null;
    profile.classId = null;
    identity.realname = '';
    identity.collegeId = null;
    identity.grade = '';
    identity.classId = null;
    identity.reason = '';
    identity.email = '';
    identity.phone = '';
    identity.qq = '';
    identity.cfUsername = '';
    identity.github = '';
    identity.blog = '';
    identityGradeOptions.value = [];
    identityClassOptions.value = [];
    myRequests.value = [];
    requestsTotal.value = 0;
    requestsPage.value = 1;
    requestsError.value = null;
    hasPending.value = false;
    clearPasswordForm();
  };

  return {
    profile,
    profileLoading,
    profileError,
    profileLoaded,
    savingProfile,
    loadProfile,
    saveProfile,
    passwordForm,
    changingPassword,
    submitPassword,
    identity,
    identityCollegeOptions,
    identityGradeOptions,
    identityClassOptions,
    submittingIdentity,
    loadIdentityColleges,
    handleIdentityCollegeChange,
    handleIdentityGradeChange,
    myRequests,
    requestsLoading,
    requestsError,
    requestsTotal,
    requestsPage,
    requestsPageSize,
    hasPending,
    fetchMyRequests,
    handleRequestsPageChange,
    handleRequestsPageSizeChange,
    submitIdentity,
    loadAll,
    reset,
    isValidAvatar,
  };
}
