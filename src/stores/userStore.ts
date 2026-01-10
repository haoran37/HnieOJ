import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 角色枚举
export enum UserRole {
  GUEST = 'GUEST',         // 未登录
  STUDENT = 'STUDENT',     // 学生
  TA = 'TA',               // 助教/志愿者
  TEACHER = 'TEACHER',     // 教师
  ADMIN = 'ADMIN',         // 系统管理员
  ROOT = 'ROOT'            // 超级管理员
}

// 用户信息类型
export interface UserInfo {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  avatar?: string;
}

export const useUserStore = defineStore('user', () => {
  // State
  const userInfo = ref({
    id: '202202050231',
    username: 'MyUserAccount',
    name: '我',
    email: 'test@hnie.edu.cn',
    role: UserRole.ADMIN, 
    //TODO: 登录后从后端获取覆盖
    avatar: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
  });

  const token = ref<string | null>(localStorage.getItem('token'));

  // 用户题目数据
  //TODO: 登录后从后端获取覆盖
  const acceptedProblems = ref<Set<string>>(new Set(['1001', '1003', '1005', '1007']));
  const wrongProblems = ref<Set<string>>(new Set(['1002', '1006']));

  // --------------------------------------------------
  // Getters
  // --------------------------------------------------

  // 是否已登录
  const isLogin = computed(() => !!token.value);

  // 是否绑定邮箱
  const isEmailBound = computed(() => !!userInfo.value.email);

  // 是否是工作人员 (助教及以上)
  const isStaff = computed(() => {
    const roles = [UserRole.TA, UserRole.TEACHER, UserRole.ADMIN, UserRole.ROOT];
    return roles.includes(userInfo.value.role);
  });

  // 是否是教师及以上
  const isTeacher = computed(() => {
    const roles = [UserRole.TEACHER, UserRole.ADMIN, UserRole.ROOT];
    return roles.includes(userInfo.value.role);
  });

  // 是否是管理员 
  const isAdmin = computed(() => {
    const roles = [UserRole.ADMIN, UserRole.ROOT];
    return roles.includes(userInfo.value.role);
  });

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------

  // 检查题目状态
  const getProblemStatus = (pid: string) => {
    if (acceptedProblems.value.has(pid)) return 'AC';
    if (wrongProblems.value.has(pid)) return 'WA';
    return 'TODO';
  };

  //TODO: 登录更新信息
  const setUserInfo = (data: Partial<UserInfo>, newToken?: string) => {
    userInfo.value = {
      ...userInfo.value,
      ...data
    };

    if (newToken !== undefined) {
      token.value = newToken;
      if (newToken) {
        localStorage.setItem('token', newToken);
      } else {
        localStorage.removeItem('token');
      }
    }
  };

  //TODO: 退出登录
    const logout = () => {
    token.value = null;
    localStorage.removeItem('token');
    userInfo.value = {
      id: '',
      username: '',
      name: '',
      email: '',
      role: UserRole.GUEST,
      avatar: ''
    };
  };

return {
    userInfo,
    token,
    acceptedProblems,
    wrongProblems,

    isLogin,
    isEmailBound,
    isStaff,
    isTeacher,
    isAdmin,

    UserRole,

    getProblemStatus,
    setUserInfo,
    logout
  };
});