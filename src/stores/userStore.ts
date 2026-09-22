import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ApiError, getProfile, login as loginRequest, setUnauthorizedHandler } from '@/utils/api';
import { hasAnyRole, normalizeRoles, primaryRole, type Role } from '@/types/user';

// 角色枚举（用 const 对象 + 同名类型，保持 UserRole.XXX 访问方式，同时可在 Node 下直接回归）
export const UserRole = {
  GUEST: 'GUEST',         // 未登录
  STUDENT: 'STUDENT',     // 学生
  TA: 'TA',               // 助教/志愿者
  TEACHER: 'TEACHER',     // 教师
  ADMIN: 'ADMIN',         // 系统管理员
  ROOT: 'ROOT'            // 超级管理员
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// 用户信息类型
export interface UserInfo {
  id: string;              // 对应后端 uid
  username: string;
  name: string;
  email?: string;
  role: UserRole;          // 主角色（多角色时取权限最高者）
  roles: Role[];           // 后端返回的真实角色列表
  avatar?: string;
  college?: string;
  class?: string;
}

const createGuestInfo = (): UserInfo => ({
  id: '',
  username: '',
  name: '',
  email: '',
  role: UserRole.GUEST,
  roles: [],
  avatar: '',
  college: '',
  class: '',
});

export const useUserStore = defineStore('user', () => {
  // State
  // 默认访客：不注入任何假 token、假用户或假题目状态
  const userInfo = ref<UserInfo>(createGuestInfo());
  const token = ref<string | null>(localStorage.getItem('token'));

  // 用户题目数据：后端暂无用户已做题聚合接口，保持空集合；
  // 未查询到的题目一律返回未知，绝不伪称“未开始”
  const acceptedProblems = ref<Set<string>>(new Set());
  const wrongProblems = ref<Set<string>>(new Set());

  // 会话恢复状态：sessionReady 供路由守卫判断是否已尝试过 profile 恢复
  const sessionReady = ref(false);
  const sessionError = ref<string | null>(null);
  let restorePromise: Promise<void> | null = null;
  // 会话代号：login/logout 会递增，用于丢弃在途的过期 profile 响应
  let sessionEpoch = 0;

  // --------------------------------------------------
  // Getters
  // --------------------------------------------------

  // 是否已登录（仅表示本地持有 token，权限以 roles 为准）
  const isLogin = computed(() => !!token.value);

  // 是否绑定邮箱
  const isEmailBound = computed(() => !!userInfo.value.email);

  // 是否是学生及以上
  const isStudent = computed(() =>
    hasAnyRole(userInfo.value.roles, ['STUDENT', 'TA', 'TEACHER', 'ADMIN', 'ROOT'])
  );

  // 是否是助教及以上（工作人员）
  const isStaff = computed(() =>
    hasAnyRole(userInfo.value.roles, ['TA', 'TEACHER', 'ADMIN', 'ROOT'])
  );

  // 是否是教师及以上
  const isTeacher = computed(() =>
    hasAnyRole(userInfo.value.roles, ['TEACHER', 'ADMIN', 'ROOT'])
  );

  // 是否是管理员
  const isAdmin = computed(() =>
    hasAnyRole(userInfo.value.roles, ['ADMIN', 'ROOT'])
  );

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------

  // 检查题目状态：仅在有真实已做记录时返回 AC/WA，其余为未知（不得当作未开始）
  const getProblemStatus = (pid: string) => {
    if (acceptedProblems.value.has(pid)) return 'AC';
    if (wrongProblems.value.has(pid)) return 'WA';
    return 'UNKNOWN';
  };

  const applyRoles = (roles: Role[]) => {
    userInfo.value.roles = roles;
    userInfo.value.role = primaryRole(roles) as UserRole;
  };

  const setUserInfo = (data: Partial<UserInfo>, newToken?: string) => {
    userInfo.value = {
      ...userInfo.value,
      ...data
    };

    if (data.roles || data.role) {
      applyRoles(data.roles ?? (data.role ? [data.role] : []));
    }

    if (newToken !== undefined) {
      token.value = newToken;
      if (newToken) {
        localStorage.setItem('token', newToken);
      } else {
        localStorage.removeItem('token');
      }
    }
  };

  // 从后端 profile 覆盖当前用户信息
  const loadProfile = async () => {
    const epoch = sessionEpoch;
    const profile = await getProfile();
    // 请求在途期间发生 logout/login：丢弃过期响应，避免旧用户/角色回填
    if (epoch !== sessionEpoch) return;
    setUserInfo({
      id: profile.uid ?? '',
      username: profile.username ?? '',
      name: profile.realname || profile.username || '',
      email: profile.email ?? '',
      avatar: profile.avatar ?? '',
      college: profile.college ?? '',
      class: profile.class ?? '',
      roles: normalizeRoles(profile.roles)
    });
  };

  // 刷新时用本地 token 恢复会话；401 清理 session，其他错误保留 token 并暴露可重试错误
  const restoreSession = async (): Promise<void> => {
    if (sessionReady.value) return;
    if (restorePromise) return restorePromise;

    restorePromise = (async () => {
      if (!token.value) {
        sessionReady.value = true;
        return;
      }
      try {
        await loadProfile();
        sessionError.value = null;
        sessionReady.value = true;
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) {
          // 认证失效：request 层的 401 回调已同步清理 token/storage
          logout();
        } else {
          // 网络/服务异常不算恢复完成，保留 token，后续导航可重试
          sessionError.value = error instanceof Error ? error.message : '加载用户信息失败';
          sessionReady.value = false;
        }
      } finally {
        restorePromise = null;
      }
    })();

    return restorePromise;
  };

  // 登录：使用真实接口，roles 来自后端
  const login = async (uid: string, password: string): Promise<void> => {
    sessionEpoch += 1;
    const data = await loginRequest(uid, password);
    setUserInfo(
      {
        id: data.userInfo?.uid ?? uid,
        username: data.userInfo?.username ?? '',
        name: data.userInfo?.username ?? '',
        roles: normalizeRoles(data.userInfo?.roles)
      },
      data.token
    );
    sessionReady.value = true;
    sessionError.value = null;

    // 登录响应缺少头像/学院/班级等信息，成功后再拉一次 profile 补全；
    // 补全失败不影响登录结果，仅记录错误。
    try {
      await loadProfile();
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        logout();
        throw error;
      }
      sessionError.value = error instanceof Error ? error.message : '加载用户信息失败';
    }
  };

  const clearSessionError = () => {
    sessionError.value = null;
  };

  // 退出登录
  const logout = () => {
    sessionEpoch += 1;
    token.value = null;
    localStorage.removeItem('token');
    userInfo.value = createGuestInfo();
    acceptedProblems.value = new Set();
    wrongProblems.value = new Set();
    sessionError.value = null;
    sessionReady.value = true;
  };

  // 任意业务请求返回 401（含下载）时同步清理本地会话；
  // 403/网络错误不会走到这里，因此不会误清有效登录
  setUnauthorizedHandler(() => {
    if (token.value) logout();
  });

  return {
    userInfo, token, acceptedProblems, wrongProblems,
    sessionReady, sessionError,
    isLogin, isEmailBound, isStudent, isStaff, isTeacher, isAdmin, UserRole,
    getProblemStatus, setUserInfo, loadProfile, restoreSession, login, logout, clearSessionError
  };
});
