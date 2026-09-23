// 用户/认证相关类型，以及不依赖任何运行时库的纯权限计算工具。
// 纯函数放在这里是为了能在 Node 下直接做回归验证，不引入测试框架依赖。

export type Role = 'GUEST' | 'STUDENT' | 'TA' | 'TEACHER' | 'ADMIN' | 'ROOT'

// 登录接口返回 data
export interface LoginResult {
  token: string
  userInfo: {
    uid: string
    username: string
    roles: string[]
  }
}

// 注册接口请求体（字段与后端 RegisterRequest 对齐）
export interface RegisterPayload {
  uid: string
  username: string
  password: string
  email: string
  collegeId: number
  classId: number
  grade: string
  qq: string
  inviteCode?: string
}

// GET /api/user/profile 返回 data；字段名与后端 UserProfileVo 的 Jackson 序列化一致
// （collegeId/classId 等为 camelCase，CF 用户名为 cf_username）
export interface UserProfile {
  uid: string
  username: string
  realname?: string | null
  email?: string | null
  avatar?: string | null
  college?: string | null
  collegeId?: number | null
  class?: string | null
  classId?: number | null
  grade?: string | null
  qq?: string | null
  phone?: string | null
  // 后端 UserProfileVo 的 CF 用户名（响应字段为 cf_username）
  cf_username?: string | null
  github?: string | null
  blog?: string | null
  roles?: string[] | null
}

// 基础数据接口返回 data
export interface CollegeOption {
  id: number
  name: string
}

export interface GradeOption {
  id: number
  grade: string
}

export interface ClassOption {
  id: number
  name: string
}

// 后端返回小写角色名，前端角色枚举/类型统一使用大写
const ROLE_MAP: Record<string, Role> = {
  guest: 'GUEST',
  student: 'STUDENT',
  ta: 'TA',
  teacher: 'TEACHER',
  admin: 'ADMIN',
  root: 'ROOT',
}

// 权限由高到低，用于多角色用户选取主角色
const ROLE_RANK: Record<Role, number> = {
  GUEST: 0,
  STUDENT: 1,
  TA: 2,
  TEACHER: 3,
  ADMIN: 4,
  ROOT: 5,
}

/** 将后端角色列表规范化为前端角色列表，忽略未知角色并去重 */
export function normalizeRoles(raw: readonly string[] | null | undefined): Role[] {
  if (!raw || raw.length === 0) return []
  const result: Role[] = []
  for (const item of raw) {
    const role = ROLE_MAP[String(item).toLowerCase()]
    if (role && !result.includes(role)) {
      result.push(role)
    }
  }
  return result
}

/** 多角色用户的主角色（权限最高者），无角色时为 GUEST */
export function primaryRole(roles: readonly Role[]): Role {
  let current: Role = 'GUEST'
  for (const role of roles) {
    if (ROLE_RANK[role] > ROLE_RANK[current]) {
      current = role
    }
  }
  return current
}

/** 用户角色列表中是否包含 allowed 中的任意一个 */
export function hasAnyRole(roles: readonly Role[], allowed: readonly Role[]): boolean {
  return roles.some((role) => allowed.includes(role))
}
