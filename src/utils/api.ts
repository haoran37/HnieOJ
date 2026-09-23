// 所有api请求集中在这

import type {
  ClassOption,
  CollegeOption,
  GradeOption,
  LoginResult,
  RegisterPayload,
  UserProfile,
} from '@/types/user'
import type {
  PageVo,
  ProblemCheckVo,
  ProblemDetailVo,
  ProblemListVo,
  ProblemSearchParams,
} from '@/types/problem'
import type {
  SubmissionCaseVo,
  SubmissionDetailVo,
  SubmissionListQuery,
  SubmissionListItemVo,
  SubmitCodeRequest,
  SubmitCodeVo,
} from '@/types/submission'

// API 基础地址：留空表示同源（开发环境由 Vite 代理 /api、/ws 到后端）
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? ''

// 后端统一响应体
export interface Result<T> {
  code: number
  msg: string
  data: T
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: string
  query?: Record<string, QueryValue>
  body?: unknown
  headers?: Record<string, string>
}

// 请求错误：同时携带 HTTP 状态码与业务 code，便于区分认证失效(401)与无权限(403)
export class ApiError extends Error {
  readonly status: number | null
  readonly code: number | null

  constructor(message: string, options: { status?: number | null; code?: number | null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? null
    this.code = options.code ?? null
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === 401
  }
}

// 认证失效（401）回调：由 store 注册，用于在任意请求（含下载）认证失效时同步清理本地会话。
// 这里只保存回调、不 import store，避免 api <-> store 循环依赖。
type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

function notifyUnauthorized(error: ApiError): void {
  if (!error.isUnauthorized || !unauthorizedHandler) return
  try {
    unauthorizedHandler()
  } catch {
    // 清理回调本身失败不应掩盖原始请求错误
  }
}

function buildUrl(url: string, query?: Record<string, QueryValue>): string {
  const base = API_BASE_URL ? API_BASE_URL.replace(/\/+$/, '') : ''
  const path = url.startsWith('/') ? url : `/${url}`
  let full = `${base}${path}`

  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      // 保留 0 / false / 空字符串，只跳过 null 与 undefined
      if (value === null || value === undefined) continue
      // 数组参数按同名 key 重复拼接（后端 List<String> tags 等）
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === null || item === undefined) continue
          params.append(key, String(item))
        }
        continue
      }
      params.append(key, String(value))
    }
    const qs = params.toString()
    if (qs) {
      full += full.includes('?') ? `&${qs}` : `?${qs}`
    }
  }

  return full
}

function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem('token')
}

function buildHeaders(options: RequestOptions, body: unknown): Headers {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  // FormData 交给浏览器自动带 boundary，不能手动设置 Content-Type
  if (body !== undefined && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

async function send(url: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, query } = options
  const headers = buildHeaders(options, body)

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    payload = JSON.stringify(body)
  }

  try {
    return await fetch(buildUrl(url, query), { method, headers, body: payload })
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '网络请求失败')
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function messageFrom(data: unknown): string | null {
  if (typeof data === 'object' && data !== null && 'msg' in data) {
    const msg = (data as { msg?: unknown }).msg
    if (typeof msg === 'string' && msg) return msg
  }
  return null
}

function codeFrom(data: unknown): number | null {
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code?: unknown }).code
    if (typeof code === 'number') return code
  }
  return null
}

/**
 * 发起请求并解包后端 Result：
 * - HTTP 非 2xx 抛 ApiError（带 status）
 * - 业务 code 非 200 抛 ApiError（带 code）
 * - 成功返回 data，data 为空时返回 null
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(url, options)
  const data = await readJson(response)

  if (!response.ok) {
    const error = new ApiError(messageFrom(data) ?? `请求失败（HTTP ${response.status}）`, {
      status: response.status,
      code: codeFrom(data),
    })
    notifyUnauthorized(error)
    throw error
  }

  const result = data as Partial<Result<T>> | null
  if (!result || typeof result.code !== 'number') {
    throw new ApiError('响应数据格式错误', { status: response.status })
  }
  if (result.code !== 200) {
    const error = new ApiError(result.msg || '请求失败', { status: response.status, code: result.code })
    notifyUnauthorized(error)
    throw error
  }

  return result.data as T
}

export function get<T>(
  url: string,
  query?: Record<string, QueryValue>,
  options: Omit<RequestOptions, 'method' | 'query'> = {},
): Promise<T> {
  return request<T>(url, { ...options, method: 'GET', query })
}

export function post<T>(
  url: string,
  body?: unknown,
  options: Omit<RequestOptions, 'method' | 'body'> = {},
): Promise<T> {
  return request<T>(url, { ...options, method: 'POST', body })
}

export function put<T>(
  url: string,
  body?: unknown,
  options: Omit<RequestOptions, 'method' | 'body'> = {},
): Promise<T> {
  return request<T>(url, { ...options, method: 'PUT', body })
}

export function del<T>(
  url: string,
  body?: unknown,
  options: Omit<RequestOptions, 'method' | 'body'> = {},
): Promise<T> {
  return request<T>(url, { ...options, method: 'DELETE', body })
}

/**
 * 下载二进制响应（如导入模板）。
 * 后端出错时会返回统一 Result 的 JSON（含 HTTP 200 业务错误），
 * 因此命中 JSON 必须先按 Result 解析并抛错，绝不能把错误 JSON 当成文件保存为“成功”。
 */
export interface DownloadedBlob {
  blob: Blob
  /** 后端 Content-Disposition 中的原始文件名；未提供时为 null */
  filename: string | null
}

/** 解析 Content-Disposition，优先 RFC 5987 的 filename*，退回 filename */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      return null
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1]?.trim() || null
}

export async function downloadFile(url: string, query?: Record<string, QueryValue>): Promise<DownloadedBlob> {
  const response = await send(url, { method: 'GET', query })
  const contentType = response.headers.get('Content-Type') ?? ''

  if (contentType.includes('application/json')) {
    const data = await readJson(response)

    if (!response.ok) {
      const error = new ApiError(messageFrom(data) ?? `下载失败（HTTP ${response.status}）`, {
        status: response.status,
        code: codeFrom(data),
      })
      notifyUnauthorized(error)
      throw error
    }

    const result = data as Partial<Result<unknown>> | null
    if (!result || typeof result.code !== 'number') {
      throw new ApiError('响应数据格式错误', { status: response.status })
    }
    if (result.code !== 200) {
      const error = new ApiError(result.msg || '下载失败', { status: response.status, code: result.code })
      notifyUnauthorized(error)
      throw error
    }
    // code 200 却仍是 JSON：说明没有实际文件内容
    throw new ApiError(result.msg || '下载失败：响应不是文件', { status: response.status, code: result.code })
  }

  if (!response.ok) {
    const data = await readJson(response)
    const error = new ApiError(messageFrom(data) ?? `下载失败（HTTP ${response.status}）`, {
      status: response.status,
      code: codeFrom(data),
    })
    notifyUnauthorized(error)
    throw error
  }

  const blob = await response.blob()
  return { blob, filename: filenameFromDisposition(response.headers.get('Content-Disposition')) }
}

export async function download(url: string, query?: Record<string, QueryValue>): Promise<Blob> {
  return (await downloadFile(url, query)).blob
}

// --------------------------------------------------
// 认证与基础数据接口
// --------------------------------------------------

export function login(uid: string, password: string): Promise<LoginResult> {
  return post<LoginResult>('/api/auth/login', { uid, password })
}

export function register(payload: RegisterPayload): Promise<null> {
  return post<null>('/api/auth/register', payload)
}

export function getProfile(): Promise<UserProfile> {
  return get<UserProfile>('/api/user/profile')
}

export function getColleges(): Promise<CollegeOption[]> {
  return get<CollegeOption[]>('/api/colleges')
}

export function getGrades(collegeId: number): Promise<GradeOption[]> {
  return get<GradeOption[]>(`/api/colleges/${collegeId}/grades`)
}

export function getClasses(collegeId: number, grade: string): Promise<ClassOption[]> {
  return get<ClassOption[]>(`/api/colleges/${collegeId}/grades/${encodeURIComponent(grade)}/classes`)
}

/**
 * 按 id 批量反查班级（需登录）：一次请求拿到全部已选班级的名称，请求数不随学院/年级数量增长。
 * 库中不存在的 id 会被后端跳过，调用方对未命中的 id 保留原 id 展示即可。
 */
export function getClassesByIds(ids: number[]): Promise<ClassOption[]> {
  if (ids.length === 0) return Promise.resolve([])
  return get<ClassOption[]>('/api/classes', { ids: ids.join(',') })
}

/**
 * 下载用户导入模板（xlsx）。
 * 注意：该方法需要 USER_MANAGE 权限；后端源码已提供 GET /api/users/import/template，
 * 但冻结的 backend-routes.json 尚未收录，后续后端批会补齐。
 */
export function downloadUserImportTemplate(): Promise<Blob> {
  return download('/api/users/import/template')
}

// --------------------------------------------------
// 题目接口（ProblemController / AdminProblemController）
// --------------------------------------------------

export function getProblemList(
  page: number,
  pageSize: number,
  params: Partial<ProblemSearchParams> = {},
): Promise<PageVo<ProblemListVo>> {
  return get<PageVo<ProblemListVo>>('/api/problems', {
    page,
    pageSize,
    keyword: params.keyword?.trim() || undefined,
    tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
    difficulty: params.difficulty ?? undefined,
  })
}

export function getProblemDetail(problemCode: string, contestId?: string): Promise<ProblemDetailVo> {
  return get<ProblemDetailVo>(`/api/problems/${encodeURIComponent(problemCode)}`,
    contestId ? { cid: contestId } : undefined)
}

// --------------------------------------------------
// 标签目录 / 标签管理（ProblemController / AdminProblemController）
// GET /api/tags 登录可读；/api/admin/tags 需 ADMIN/ROOT 且具备 problem:create/update/delete
// --------------------------------------------------

/** 对应后端 TagVo */
export interface TagVo {
  id: number
  name: string
  color: string | null
  category: string | null
}

/** 对应后端标签创建/更新请求体 */
export interface TagPayload {
  name: string
  color?: string | null
  category?: string | null
}

/** 真实标签目录（所有登录用户可读），前端按真实 category 分组展示 */
export function getTags(): Promise<TagVo[]> {
  return get<TagVo[]>('/api/tags')
}

export function createAdminTag(payload: TagPayload): Promise<null> {
  return post<null>('/api/admin/tags', payload)
}

export function updateAdminTag(id: number | string, payload: TagPayload): Promise<null> {
  return put<null>(`/api/admin/tags/${encodeURIComponent(String(id))}`, payload)
}

export function deleteAdminTag(id: number | string): Promise<null> {
  return del<null>(`/api/admin/tags/${encodeURIComponent(String(id))}`)
}

// --------------------------------------------------
// 题目推荐（ProblemController）
// --------------------------------------------------

/** 获取源题推荐：仅公开题、排除源题；limit 默认 5，后端范围 1..10 */
export function getProblemRecommendations(
  problemCode: string,
  limit = 5,
): Promise<ProblemListVo[]> {
  return get<ProblemListVo[]>(
    `/api/problems/${encodeURIComponent(problemCode)}/recommendations`,
    { limit },
  )
}

/** 通过内部数字 problemId 反查展示编号（题单等只给内部 ID 的场景） */
export function checkProblem(problemId: number): Promise<ProblemCheckVo> {
  return get<ProblemCheckVo>('/api/problems/check', { problemId })
}

export function downloadProblemTestdata(problemId: number): Promise<Blob> {
  return download(`/api/problems/${problemId}/testdata/download`)
}

export function downloadProblemTestCase(problemId: number, caseNo: number): Promise<Blob> {
  return download(`/api/problems/${problemId}/testdata/${caseNo}/download`)
}

// --------------------------------------------------
// 提交接口（SubmissionController / AdminSubmissionController）
// --------------------------------------------------

export function submitCode(payload: SubmitCodeRequest): Promise<SubmitCodeVo> {
  return post<SubmitCodeVo>('/api/submissions', payload)
}

/** 上传代码文件提交（multipart/form-data） */
export function submitCodeFile(form: FormData): Promise<SubmitCodeVo> {
  return post<SubmitCodeVo>('/api/submissions', form)
}

export function getSubmissions(query: SubmissionListQuery): Promise<PageVo<SubmissionListItemVo>> {
  return get<PageVo<SubmissionListItemVo>>('/api/submissions', {
    page: query.page,
    pageSize: query.pageSize,
    problemCode: query.problemCode || undefined,
    language: query.language || undefined,
    status: query.status ?? undefined,
    contestId: query.contestId || undefined,
    uid: query.uid || undefined,
  })
}

export function getSubmissionDetail(submissionId: string): Promise<SubmissionDetailVo> {
  return get<SubmissionDetailVo>(`/api/submissions/${encodeURIComponent(submissionId)}`)
}

export function getSubmissionCases(submissionId: string): Promise<SubmissionCaseVo[]> {
  return get<SubmissionCaseVo[]>(`/api/submissions/${encodeURIComponent(submissionId)}/cases`)
}

export interface ContestRankVo {
  rank: number
  uid: string
  username: string
  solved: number
  totalScore: number
  penaltyMinutes: number
  problemScores: Record<string, number>
}

export function getContestScoreboard(contestId: string): Promise<ContestRankVo[]> {
  return get<ContestRankVo[]>(`/api/contests/${encodeURIComponent(contestId)}/scoreboard`)
}

export interface ContestRatingVo {
  rank: number
  uid: string
  username: string
  rating: number
  contests: number
}

export function getContestRatings(): Promise<ContestRatingVo[]> {
  return get<ContestRatingVo[]>('/api/contests/ratings')
}

export function getContestRating(uid: string): Promise<ContestRatingVo | null> {
  return get<ContestRatingVo | null>(`/api/contests/ratings/${encodeURIComponent(uid)}`)
}

export interface ContributionRankVo {
  rank: number
  uid: string
  username: string
  contribution: number
  posts: number
  answers: number
}

export function getContributionRankings(): Promise<ContributionRankVo[]> {
  return get<ContributionRankVo[]>('/api/discussions/contributions')
}

export function getUserContribution(uid: string): Promise<ContributionRankVo | null> {
  return get<ContributionRankVo | null>(`/api/discussions/contributions/${encodeURIComponent(uid)}`)
}

export interface HomeworkRankVo {
  rank: number
  uid: string
  username: string
  solved: number
  totalScore: number
}

export function getHomeworkRankings(homeworkId: string): Promise<HomeworkRankVo[]> {
  return get<HomeworkRankVo[]>(`/api/homeworks/${encodeURIComponent(homeworkId)}/rankings`)
}

export interface UserSolveRankVo {
  rank: number
  uid: string
  username: string
  solved: number
  monthlySolved: number
  submissions: number
}

export function getSolveRankings(period: 'all' | 'month' = 'all'): Promise<UserSolveRankVo[]> {
  return get<UserSolveRankVo[]>('/api/submissions/rankings', { period })
}

export interface UserSubmissionSummaryVo {
  totalSubmissions: number
  acceptedProblems: number
  problems: Array<{ problemCode: string; accepted: boolean; attempts: number }>
  daily: Array<{ day: string; submissions: number; accepted: number }>
}

export function getUserSubmissionSummary(uid: string): Promise<UserSubmissionSummaryVo> {
  return get<UserSubmissionSummaryVo>(`/api/submissions/users/${encodeURIComponent(uid)}/summary`)
}

export interface AdminSubmissionDashboardVo {
  totalSubmissions: number
  reportDate?: string
  daily: Array<{ day: string; submissions: number }>
  statuses: Array<{ status: number; submissions: number }>
  hotProblems: Array<{ problemCode: string; submissions: number }>
  lowActivityProblems: Array<{ problemCode: string; submissions: number }>
}

export function getAdminSubmissionDashboard(): Promise<AdminSubmissionDashboardVo> {
  return get<AdminSubmissionDashboardVo>('/api/admin/submissions/dashboard')
}

export interface FavoriteTrainingStatVo { trainingId: string; favorites: number }
export function getTopFavoriteTrainings(): Promise<FavoriteTrainingStatVo[]> {
  return get<FavoriteTrainingStatVo[]>('/api/admin/favorites/top-trainings')
}

export type FavoriteType = 'problem' | 'training' | 'contest' | 'discussion'
export interface UserFavoriteVo {
  id: number
  uid: string
  targetType: FavoriteType
  targetId: string
  gmtCreate: string
}

export function getFavorites(type?: FavoriteType): Promise<UserFavoriteVo[]> {
  return get<UserFavoriteVo[]>('/api/user/favorites', { type })
}
export function checkFavorite(type: FavoriteType, targetId: string): Promise<boolean> {
  return get<boolean>('/api/user/favorites/check', { type, targetId })
}
export function addFavorite(type: FavoriteType, targetId: string): Promise<void> {
  return post<void>('/api/user/favorites', { type, targetId })
}
export function removeFavorite(type: FavoriteType, targetId: string): Promise<void> {
  return del<void>(`/api/user/favorites/${type}/${encodeURIComponent(targetId)}`)
}

export function rejudgeSubmission(submissionId: string): Promise<SubmitCodeVo> {
  return post<SubmitCodeVo>(`/api/admin/submissions/${encodeURIComponent(submissionId)}/rejudge`)
}

// --------------------------------------------------
// 讨论接口（DiscussionController）
// --------------------------------------------------

export interface RelatedDiscussionVo {
  id: number
  title: string
}

export function getRelatedDiscussions(problemCode: string, limit = 5): Promise<RelatedDiscussionVo[]> {
  return get<RelatedDiscussionVo[]>('/api/discussions/related', { problemCode, limit })
}

// --------------------------------------------------
// 比赛接口（ContestController）
// --------------------------------------------------

export interface ContestListVo {
  id: number
  title: string
  type: string | null
  auth: string | null
  source: string | null
  startTime: string | null
  endTime: string | null
  status: string | null
  problemCount: number | null
  customTags: string[] | null
}

export interface ContestProblemVo {
  id: number
  problemId: number
  displayId: string | null
  displayTitle: string | null
  color: string | null
}

export interface ContestDetailVo {
  id: number
  uid: string | null
  author: string | null
  title: string
  description: string | null
  startTime: string | null
  endTime: string | null
  type: string | null
  auth: string | null
  source: string | null
  status: string | null
  rankShowName: string | null
  openRank: boolean | null
  sealRank: boolean | null
  sealRankTime: string | null
  problemCount: number | null
  customTags: string[] | null
  problems: ContestProblemVo[] | null
  gmtCreate: string | null
  gmtModified: string | null
}

export interface ContestCheckVo {
  valid: boolean | null
  contestId: number | null
  title: string | null
}

/** 比赛列表排序口径：recent = 按「距当前时间由近到远」排序（首页「近期比赛」用） */
export type ContestListWindow = 'recent'

export interface ContestListOptions {
  /** 开始时间下界（epoch 毫秒，含） */
  startFrom?: number
  /** 开始时间上界（epoch 毫秒，含） */
  startTo?: number
  /** 排序口径；不传则后端按开始时间倒序 */
  window?: ContestListWindow
  participantUid?: string
}

export function getContests(
  page: number,
  pageSize: number,
  type?: string,
  auth?: string,
  options: ContestListOptions = {},
): Promise<PageVo<ContestListVo>> {
  return get<PageVo<ContestListVo>>('/api/contests', {
    page,
    pageSize,
    type: type || undefined,
    auth: auth || undefined,
    startFrom: options.startFrom,
    startTo: options.startTo,
    window: options.window,
    participantUid: options.participantUid,
  })
}

export function getContestDetail(contestId: number | string): Promise<ContestDetailVo> {
  return get<ContestDetailVo>(`/api/contests/${encodeURIComponent(String(contestId))}`)
}

export interface FeaturedContestVo {
  id: number
  title: string
  type: string
  startTime: string
  endTime: string
  status: 'running' | 'upcoming'
}

export function getFeaturedContest(): Promise<FeaturedContestVo | null> {
  return get<FeaturedContestVo | null>('/api/contests/featured')
}

export function getContestRegistration(contestId: string): Promise<boolean> {
  return get<boolean>(`/api/contests/${encodeURIComponent(contestId)}/registration`)
}

export interface MyContestTeamVo {
  teamId: number
  teamName: string
  contestId: number
  contestTitle: string
  captainUid: string
}

export function getMyContestTeams(): Promise<MyContestTeamVo[]> {
  return get<MyContestTeamVo[]>('/api/contests/teams/mine')
}

export function registerContest(contestId: string): Promise<void> {
  return post<void>(`/api/contests/${encodeURIComponent(contestId)}/registration`)
}

export function checkContest(contestId: number | string): Promise<ContestCheckVo> {
  return get<ContestCheckVo>('/api/contests/check', { cid: contestId })
}

// --------------------------------------------------
// 题单 / 作业接口（TrainingController / HomeworkController）
// --------------------------------------------------

export interface TrainingListVo {
  id: number
  title: string
  type: string | null
  auth: string | null
  author: string | null
  status: number | null
  rank: number | null
  problemCount: number | null
  categories: string[] | null
  gmtCreate: string | null
}

export interface TrainingDetailVo {
  id: number
  title: string
  description: string | null
  author: string | null
  type: string | null
  auth: string | null
  status: number | null
  rank: number | null
  problemCount: number | null
  categories: string[] | null
  gmtCreate: string | null
  gmtModified: string | null
}

export interface TrainingProblemVo {
  id: number
  problemId: number
  displayId: number | null
}

export function getTrainings(
  page: number,
  pageSize: number,
  keyword?: string,
  type?: string,
  auth?: string,
): Promise<PageVo<TrainingListVo>> {
  return get<PageVo<TrainingListVo>>('/api/trainings', {
    page,
    pageSize,
    keyword: keyword?.trim() || undefined,
    type: type || undefined,
    auth: auth || undefined,
  })
}

export function getTrainingInformation(trainingId: number | string): Promise<TrainingDetailVo> {
  return get<TrainingDetailVo>(`/api/trainings/${encodeURIComponent(String(trainingId))}/information`)
}

export function getTrainingProblems(
  trainingId: number | string,
  page: number,
  pageSize: number,
): Promise<PageVo<TrainingProblemVo>> {
  return get<PageVo<TrainingProblemVo>>(
    `/api/trainings/${encodeURIComponent(String(trainingId))}/problems`,
    { page, pageSize },
  )
}

export interface HomeworkListVo {
  id: number
  title: string
  source: string | null
  author: string | null
  status: number | null
  startTime: string | null
  endTime: string | null
  problemCount: number | null
  classCount: number | null
}

export interface HomeworkProblemVo {
  id: number
  problemId: number
  displayId: string | null
}

export interface HomeworkDetailVo {
  id: number
  title: string
  description: string | null
  source: string | null
  author: string | null
  status: number | null
  startTime: string | null
  endTime: string | null
  classIds: number[] | null
  problems: HomeworkProblemVo[] | null
  gmtCreate: string | null
  gmtModified: string | null
}

export function getHomeworks(
  page: number,
  pageSize: number,
  keyword?: string,
  classId?: number,
  classIds?: number[],
): Promise<PageVo<HomeworkListVo>> {
  return get<PageVo<HomeworkListVo>>('/api/homeworks', {
    page,
    pageSize,
    keyword: keyword?.trim() || undefined,
    classId,
    classIds: classIds?.join(','),
  })
}

export function getHomeworkDetail(homeworkId: number | string): Promise<HomeworkDetailVo> {
  return get<HomeworkDetailVo>(`/api/homeworks/${encodeURIComponent(String(homeworkId))}`)
}

// --------------------------------------------------
// 班级基础数据（BaseDataController）
// --------------------------------------------------

export interface ClassStaffVo {
  uid: string
  name: string
}

export function getClassTeachers(classId: number): Promise<ClassStaffVo[]> {
  return get<ClassStaffVo[]>(`/api/classes/${classId}/teachers`)
}

export function getClassTas(classId: number): Promise<ClassStaffVo[]> {
  return get<ClassStaffVo[]>(`/api/classes/${classId}/tas`)
}

// --------------------------------------------------
// 讨论完整接口（DiscussionController）
// --------------------------------------------------

export interface DiscussionListVo {
  id: number
  title: string
  description: string | null
  uid: string | null
  author: string | null
  role: string | null
  category: string | null
  problemCode: string | null
  viewNum: number | null
  likeNum: number | null
  topPriority: number | null
  answerCount: number | null
  gmtCreate: string | null
}

export interface DiscussionCommentVo {
  id: number
  content: string
  uid: string | null
  author: string | null
  replyToUid: string | null
  replyToName: string | null
  gmtCreate: string | null
}

export interface DiscussionAnswerVo {
  id: number
  did: number | null
  content: string
  uid: string | null
  author: string | null
  likeNum: number | null
  gmtCreate: string | null
  comments: DiscussionCommentVo[] | null
}

export interface DiscussionPostVo {
  id: number
  title: string
  content: string
  description: string | null
  uid: string | null
  author: string | null
  role: string | null
  category: string | null
  problemCode: string | null
  viewNum: number | null
  likeNum: number | null
  topPriority: number | null
  gmtCreate: string | null
  gmtModified: string | null
}

export interface DiscussionDetailVo {
  post: DiscussionPostVo
  answers: DiscussionAnswerVo[] | null
}

export interface DiscussionCreateVo {
  id: number
}

export interface DiscussionVoteVo {
  targetType: string | null
  targetId: number | null
  direction: string | null
  likeNum: number | null
}

export function getDiscussions(
  page: number,
  pageSize: number,
  options: { category?: string; keyword?: string; sort?: string; uid?: string } = {},
): Promise<PageVo<DiscussionListVo>> {
  return get<PageVo<DiscussionListVo>>('/api/discussions', {
    page,
    pageSize,
    category: options.category || undefined,
    keyword: options.keyword?.trim() || undefined,
    sort: options.sort || undefined,
    uid: options.uid || undefined,
  })
}

export function getDiscussionDetail(discussionId: number | string): Promise<DiscussionDetailVo> {
  return get<DiscussionDetailVo>(`/api/discussions/${encodeURIComponent(String(discussionId))}`)
}

export function voteDiscussion(
  type: string,
  targetId: number | string,
  direction: string,
): Promise<DiscussionVoteVo> {
  return post<DiscussionVoteVo>(
    `/api/discussions/${encodeURIComponent(type)}/${encodeURIComponent(String(targetId))}/vote`,
    { direction },
  )
}

export interface CreateDiscussionPayload {
  title: string
  category: string
  content: string
  problemCode?: string
  isTop?: boolean
}

export function createDiscussion(payload: CreateDiscussionPayload): Promise<DiscussionCreateVo> {
  return post<DiscussionCreateVo>('/api/discussions', payload)
}

export function createDiscussionAnswer(
  postId: number | string,
  content: string,
): Promise<DiscussionCreateVo> {
  return post<DiscussionCreateVo>(
    `/api/discussions/${encodeURIComponent(String(postId))}/answers`,
    { content },
  )
}

export function createDiscussionComment(
  answerId: number | string,
  content: string,
  replyTo?: { uid?: string | null; name?: string | null },
): Promise<DiscussionCreateVo> {
  return post<DiscussionCreateVo>(
    `/api/discussions/answers/${encodeURIComponent(String(answerId))}/comments`,
    { content, replyToUid: replyTo?.uid ?? undefined, replyToName: replyTo?.name ?? undefined },
  )
}

// --------------------------------------------------
// 公告接口（AnnouncementController）
// --------------------------------------------------

/** 公告分类：ANNOUNCEMENT 普通公告（默认）/ NEWS 新闻 */
export type AnnouncementCategory = 'ANNOUNCEMENT' | 'NEWS'

export interface AnnouncementListVo {
  id: number
  title: string
  uid: string | null
  status: number | null
  /** 公告分类：ANNOUNCEMENT / NEWS */
  category?: string | null
  gmtCreate: string | null
  gmtModified: string | null
}

export interface AnnouncementDetailVo extends AnnouncementListVo {
  content: string | null
}

export function getAnnouncements(
  page: number,
  pageSize: number,
  keyword?: string,
  category?: AnnouncementCategory,
): Promise<PageVo<AnnouncementListVo>> {
  return get<PageVo<AnnouncementListVo>>('/api/announcements', {
    page,
    pageSize,
    keyword: keyword?.trim() || undefined,
    // 不传/空白时不带 category，返回全部分类
    category: category || undefined,
  })
}

export function getAnnouncementDetail(id: number | string): Promise<AnnouncementDetailVo> {
  return get<AnnouncementDetailVo>(`/api/announcements/${encodeURIComponent(String(id))}`)
}

// --------------------------------------------------
// 用户资料 / 成就（UserProfileController / UserAchievementController / AchievementApplyController）
// --------------------------------------------------

export interface UserDetailVo {
  uid: string
  username: string
  realname: string | null
  avatar: string | null
  collegeId: number | null
  college: string | null
  grade: string | null
  classId: number | null
  majorClass: string | null
  /** 与后端 UserDetailVo 的 Jackson 序列化一致：CF 用户名为 cf_username */
  cf_username: string | null
  github: string | null
  blog: string | null
  roles: string[] | null
}

export interface UserAchievementVo {
  id: number
  title: string
  content: string | null
  proofUrl: string | null
  achieveTime: number | null
  status: number | null
}

export function getUserDetail(uid: string): Promise<UserDetailVo> {
  return get<UserDetailVo>(`/api/user/users/${encodeURIComponent(uid)}`)
}

export interface UserListVo {
  uid: string
  username: string
  realname: string | null
  avatar: string | null
  collegeId: number | null
  college: string | null
  grade: string | null
  classId: number | null
  majorClass: string | null
  status: number | null
  roles: string[] | null
}

/** 用户查询的可选筛选（与后端 GET /api/user/users 支持的字段对齐，均传 ID/年份而非中文名） */
export interface UserSearchFilters {
  collegeId?: number | null
  grade?: string | null
  classId?: number | null
}

export function searchUsers(
  keyword: string,
  page = 1,
  pageSize = 10,
  filters: UserSearchFilters = {},
): Promise<PageVo<UserListVo>> {
  // 年级依赖学院、班级依赖学院+年级：缺失前置条件时不发送对应参数，避免后端拒绝。
  const collegeId = filters.collegeId ?? null
  const grade = collegeId !== null ? (filters.grade?.trim() || null) : null
  const classId = collegeId !== null && grade !== null ? (filters.classId ?? null) : null
  return get<PageVo<UserListVo>>('/api/user/users', {
    keyword: keyword.trim() || undefined,
    collegeId: collegeId ?? undefined,
    grade: grade ?? undefined,
    classId: classId ?? undefined,
    page,
    pageSize,
  })
}

export function getUserAchievements(
  uid: string,
  page = 1,
  pageSize = 20,
): Promise<PageVo<UserAchievementVo>> {
  return get<PageVo<UserAchievementVo>>(
    `/api/users/${encodeURIComponent(uid)}/achievements`,
    { page, pageSize },
  )
}

/** 提交成就认证申请（multipart：title/description/file） */
export function submitAchievementApply(form: FormData): Promise<null> {
  return post<null>('/api/achievements/apply', form)
}

// --------------------------------------------------
// 用户管理（UserManageController，管理员）
// --------------------------------------------------

/** GET /api/user/check 返回 data */
export interface UserCheckVo {
  exists: boolean | null
  uid: string | null
  username: string | null
}

/** 对应后端 CreateUserRequest */
export interface CreateUserPayload {
  uid: string
  username: string
  email?: string
  password?: string
  phone?: string
  avatar?: string
  collegeId?: number | null
  classId?: number | null
  grade?: string
}

/** 对应后端 CreateUserVo（create 未传密码时返回生成的初始密码） */
export interface CreateUserVo {
  uid: string
  initialPassword: string | null
}

/** 对应后端 UpdateUserRequest（status 0 正常 / 1 禁用） */
export interface UpdateUserPayload {
  username?: string
  email?: string
  status?: number
  phone?: string
  avatar?: string
  collegeId?: number | null
  classId?: number | null
  grade?: string
}

/** GET /api/user/users 查询参数（后端只支持这些筛选字段） */
export interface UserListQuery {
  keyword?: string
  collegeId?: number | null
  grade?: string | null
  classId?: number | null
  page: number
  pageSize: number
}

export function getUsers(query: UserListQuery): Promise<PageVo<UserListVo>> {
  return get<PageVo<UserListVo>>('/api/user/users', {
    keyword: query.keyword?.trim() || undefined,
    collegeId: query.collegeId ?? undefined,
    grade: query.grade || undefined,
    classId: query.classId ?? undefined,
    page: query.page,
    pageSize: query.pageSize,
  })
}

/** 检查 uid/用户名是否存在（GET /api/user/check?query=） */
export function checkUser(query: string): Promise<UserCheckVo> {
  return get<UserCheckVo>('/api/user/check', { query: query.trim() })
}

export function createUser(payload: CreateUserPayload): Promise<CreateUserVo> {
  return post<CreateUserVo>('/api/users', payload)
}

export function updateUser(uid: string, payload: UpdateUserPayload): Promise<null> {
  return put<null>(`/api/users/${encodeURIComponent(uid)}`, payload)
}

export function updateUserPassword(uid: string, password: string): Promise<null> {
  return put<null>(`/api/users/${encodeURIComponent(uid)}/password`, { password })
}

export function deleteUser(uid: string): Promise<null> {
  return del<null>(`/api/users/${encodeURIComponent(uid)}`)
}

export function batchDisableUsers(uids: string[]): Promise<null> {
  return put<null>('/api/users/batch/disable', { uids })
}

export function batchEnableUsers(uids: string[]): Promise<null> {
  return put<null>('/api/users/batch/enable', { uids })
}

export function batchDeleteUsers(uids: string[]): Promise<null> {
  return del<null>('/api/users/batch', { uids })
}

/** 导入失败行（用户导入与注册名单导入共用同一后端结构） */
export interface ImportFailureItem {
  rowNo: number | null
  uid: string | null
  reason: string | null
}

/** 对应后端 UserImportResultVo.CreatedUserItem（initialPassword 只在本次结果中出现） */
export interface UserImportCreatedUser {
  uid: string
  initialPassword: string | null
}

/** 对应后端 UserImportResultVo */
export interface UserImportResultVo {
  successCount: number
  failedCount: number
  createdUsers: UserImportCreatedUser[]
  failures: ImportFailureItem[]
}

/**
 * 上传用户导入 Excel（multipart file，需 USER_MANAGE）。
 * 表头为 uid/username/email/password/phone/avatar/collegeId/classId/grade，单次最多 1000 行。
 */
export function importUsers(file: File): Promise<UserImportResultVo> {
  const form = new FormData()
  form.append('file', file)
  return post<UserImportResultVo>('/api/users/import', form)
}

// --------------------------------------------------
// 权限管理（AdminPermissionController）
// --------------------------------------------------

/** 对应后端 PermissionUserVo */
export interface PermissionUserVo {
  uid: string
  username: string | null
  college: string | null
  majorClass: string | null
  email: string | null
  phone: string | null
  roles: string[] | null
}

/** 对应后端 UserSearchVo */
export interface UserSearchVo {
  uid: string
  username: string | null
  majorClass: string | null
  college: string | null
  roles: string[] | null
}

export function getPermissionUsers(page: number, pageSize: number): Promise<PageVo<PermissionUserVo>> {
  return get<PageVo<PermissionUserVo>>('/api/admin/permission/users', { page, pageSize })
}

export function searchAdminUsers(
  query: string,
  page = 1,
  pageSize = 10,
): Promise<PageVo<UserSearchVo>> {
  return get<PageVo<UserSearchVo>>('/api/admin/users/search', {
    query: query.trim(),
    page,
    pageSize,
  })
}

/** 后端 role 接收 TA/TEACHER/ADMIN（大小写不敏感，源码按 RoleConstant 小写归一） */
export function grantPermissions(uids: string[], role: string): Promise<null> {
  return post<null>('/api/admin/permission/grant', { uids, role })
}

export function updateUserPermission(uid: string, role: string): Promise<null> {
  return put<null>('/api/admin/permission/update', { uid, role })
}

export function revokeUserPermission(uid: string): Promise<null> {
  return del<null>('/api/admin/permission/revoke', undefined, { query: { uid } })
}

export function batchRevokePermissions(uids: string[]): Promise<null> {
  return del<null>('/api/admin/permission/batch-revoke', { uids })
}

// --------------------------------------------------
// 注册审核（RegistrationReviewController）
// --------------------------------------------------

/** 对应后端 RegistrationApplyVo（status: 0 待处理 / 1 通过 / 2 驳回） */
export interface RegistrationApplyVo {
  uid: string
  username: string | null
  email: string | null
  collegeId: number | null
  collegeName: string | null
  classId: number | null
  className: string | null
  grade: string | null
  qq: string | null
  status: number | null
  replyInfo: string | null
  submitTime: number | null
}

export function getRegistrations(
  page: number,
  pageSize: number,
  status?: number,
  keyword?: string,
): Promise<PageVo<RegistrationApplyVo>> {
  return get<PageVo<RegistrationApplyVo>>('/api/registrations', {
    page,
    pageSize,
    status,
    keyword: keyword?.trim() || undefined,
  })
}

export function approveRegistration(uid: string): Promise<null> {
  return post<null>(`/api/registrations/${encodeURIComponent(uid)}/approve`)
}

export function rejectRegistration(uid: string, reason: string): Promise<null> {
  return post<null>(`/api/registrations/${encodeURIComponent(uid)}/reject`, { reason })
}

/** 批量通过返回后端汇总文案（成功/失败数量） */
export function batchApproveRegistrations(uids: string[]): Promise<string> {
  return post<string>('/api/registrations/batch/approve', { uids })
}

/** 对应后端 RegistrationImportResultVo */
export interface RegistrationImportResultVo {
  successCount: number
  failedCount: number
  successUids: string[]
  failures: ImportFailureItem[]
}

/**
 * 上传注册名单 Excel（multipart file，ADMIN/ROOT）。
 * 表头为 uid/username/password/email/collegeId/classId/grade/qq，
 * 每行先注册再自动通过，不是审批已有 UID；单次最多 1000 行。
 */
export function importRegistrations(file: File): Promise<RegistrationImportResultVo> {
  const form = new FormData()
  form.append('file', file)
  return post<RegistrationImportResultVo>('/api/registrations/import', form)
}

// --------------------------------------------------
// 成就审核与用户成就（AdminAchievementApplyController / AdminUserAchievementController）
// --------------------------------------------------

/**
 * 对应后端 AchievementApplyAdminVo。
 * fileUrl：本地附件为受保护下载路径 /api/admin/achievements/{id}/file，
 * 外部附件为原始 http(s) 地址。
 */
export interface AchievementApplyAdminVo {
  id: number
  uid: string
  username: string | null
  title: string
  status: string | null
  description: string | null
  fileUrl: string | null
  submitTime: number | null
}

export function getAdminAchievements(
  page: number,
  pageSize: number,
  options: { keyword?: string; status?: string; collegeId?: number | null } = {},
): Promise<PageVo<AchievementApplyAdminVo>> {
  return get<PageVo<AchievementApplyAdminVo>>('/api/admin/achievements', {
    page,
    pageSize,
    keyword: options.keyword?.trim() || undefined,
    status: options.status || undefined,
    college: options.collegeId ?? undefined,
  })
}

export function approveAchievement(id: number): Promise<null> {
  return post<null>(`/api/admin/achievements/${id}/approve`)
}

export function rejectAchievement(id: number, reason: string): Promise<null> {
  return post<null>(`/api/admin/achievements/${id}/reject`, { reason })
}

/**
 * 批量审核通过（按申请 id）。
 * 后端逐个返回结果：HTTP 200 也可能部分/全部失败，调用方必须以
 * successCount/failedCount/failures 为准，不能因为 200 就显示全部成功。
 */
export function batchApproveAchievements(
  ids: number[],
): Promise<{ successCount: number; failedCount: number; failures: { id: number; reason: string }[] }> {
  return post('/api/admin/achievements/batch/approve', { ids })
}

/** 本地附件需 Bearer 鉴权下载（blob） */
export function downloadAchievementApplyFile(id: number): Promise<DownloadedBlob> {
  return downloadFile(`/api/admin/achievements/${id}/file`)
}

/** 对应后端 AddUserAchievementRequest */
export interface AddUserAchievementPayload {
  title?: string
  content: string
  proofUrl?: string
  achieveTime?: number
}

export function addUserAchievement(uid: string, payload: AddUserAchievementPayload): Promise<null> {
  return post<null>(`/api/admin/users/${encodeURIComponent(uid)}/achievements`, payload)
}

export function deleteUserAchievement(uid: string, achievementId: number): Promise<null> {
  return del<null>(`/api/admin/users/${encodeURIComponent(uid)}/achievements/${achievementId}`)
}

// --------------------------------------------------
// 系统配置（AdminSystemConfigController）
// --------------------------------------------------

/** 对应后端 SystemConfigVo（不含 smtpPassword，只写不读） */
export interface AdminSystemConfigVo {
  websiteName: string | null
  logoUrl: string | null
  icpCode: string | null
  allowRegister: boolean | null
  registerMode: string | null
  allowedEmailSuffixes: string[] | null
  smtpHost: string | null
  smtpPort: number | null
  smtpEmail: string | null
  smtpNickname: string | null
  submissionInterval: number | null
  gmtModified: string | null
}

/** 对应后端 SystemConfigSaveRequest */
export interface AdminSystemConfigSaveRequest {
  websiteName: string
  logoUrl?: string | null
  icpCode?: string | null
  allowRegister: boolean
  registerMode: string
  allowedEmailSuffixes?: string[]
  smtpHost?: string | null
  smtpPort?: number | null
  smtpEmail?: string | null
  smtpPassword?: string
  smtpNickname?: string | null
  submissionInterval: number
}

export function getAdminSystemConfig(): Promise<AdminSystemConfigVo> {
  return get<AdminSystemConfigVo>('/api/admin/config')
}

export function saveAdminSystemConfig(payload: AdminSystemConfigSaveRequest): Promise<null> {
  return put<null>('/api/admin/config', payload)
}

// --------------------------------------------------
// 远程评测账号管理（AdminJudgeController）
// 密码只写不读：VO 不含 password，请求 DTO 的 toString 也排除密码
// --------------------------------------------------

/** 对应后端 RemoteJudgeAccountVo（无 password） */
export interface RemoteJudgeAccountVo {
  id: number
  oj: string
  username: string
  status: number
  maxConcurrency: number | null
  gmtCreate: string | null
}

/** 对应后端账号创建请求：password 必填 */
export interface RemoteJudgeAccountCreateRequest {
  oj: string
  username: string
  password: string
  status?: number
  maxConcurrency?: number
}

/** 对应后端账号更新请求：字段均可选，缺省保留原值；空白 password 保留原密码，非空原样保存（不 trim） */
export interface RemoteJudgeAccountUpdateRequest {
  oj?: string
  username?: string
  password?: string
  status?: number
  maxConcurrency?: number
}

export function getRemoteJudgeAccounts(
  params: { oj?: string; status?: number | null } = {},
): Promise<RemoteJudgeAccountVo[]> {
  return get<RemoteJudgeAccountVo[]>('/api/admin/judge/account', {
    oj: params.oj?.trim() || undefined,
    status: params.status ?? undefined,
  })
}

export function createRemoteJudgeAccount(payload: RemoteJudgeAccountCreateRequest): Promise<null> {
  return post<null>('/api/admin/judge/account', payload)
}

export function updateRemoteJudgeAccount(
  id: number | string,
  payload: RemoteJudgeAccountUpdateRequest,
): Promise<null> {
  return put<null>(`/api/admin/judge/account/${encodeURIComponent(String(id))}`, payload)
}

export function deleteRemoteJudgeAccount(id: number | string): Promise<null> {
  return del<null>(`/api/admin/judge/account/${encodeURIComponent(String(id))}`)
}

// --------------------------------------------------
// 系统公开信息（SystemController）
// --------------------------------------------------

export interface SystemPublicConfigVo {
  websiteName: string | null
  logoUrl: string | null
  icpCode: string | null
  allowRegister: boolean | null
  registerMode: string | null
  allowedEmailSuffixes: string[] | null
  gmtModified: string | null
}

export interface SystemTimeVo {
  serverTime: string | null
  timezone: string | null
  unixTimestamp: number | null
}

export function getPublicConfig(): Promise<SystemPublicConfigVo> {
  return get<SystemPublicConfigVo>('/api/system/public-config')
}

export function getSystemTime(): Promise<SystemTimeVo> {
  return get<SystemTimeVo>('/api/system/time')
}

export interface InviteCodeVo {
  id: number
  status: number
  createdBy: string
  usedUid: string | null
  usedAt: string | null
  expiresAt: string
  gmtCreate: string
}

export function getInviteCodes(): Promise<InviteCodeVo[]> {
  return get<InviteCodeVo[]>('/api/admin/invite-codes')
}

export function createInviteCode(expiresAt: number): Promise<string> {
  return post<string>('/api/admin/invite-codes', { expiresAt })
}

export function revokeInviteCode(id: number): Promise<null> {
  return post<null>(`/api/admin/invite-codes/${id}/revoke`)
}

// --------------------------------------------------
// 题目管理（AdminProblemController）
// 字段以后端 ProblemRequest / AdminProblemListVo / AdminProblemDetailVo 为准。
// --------------------------------------------------

/** 对应后端 ProblemExampleRequest（input/output 均不能为空） */
export interface AdminProblemExample {
  input: string
  output: string
}

/** 对应后端 ProblemRequest：管理端新增/编辑题目的全部可编辑字段 */
export interface AdminProblemRequest {
  /** 编辑时必填（内部数字 id），新增时应省略 */
  id?: number | null
  problemCode: string
  title: string
  author?: string | null
  type?: number | null
  judgeMode?: string | null
  timeLimit?: number | null
  memoryLimit?: number | null
  stackLimit?: number | null
  description?: string | null
  input?: string | null
  output?: string | null
  examples?: AdminProblemExample[] | null
  hint?: string | null
  difficulty?: number | null
  /** 1 公开 / 2 私有 / 3 仅比赛 */
  auth: number
  ioScore?: number | null
  isRemote?: boolean | null
  source?: string | null
  spjCode?: string | null
  spjLanguage?: string | null
  spjTimeLimit?: number | null
  spjMemoryLimit?: number | null
  spjStackLimit?: number | null
  spjOutputLimit?: number | null
  spjProtocol?: string | null
  interactorCode?: string | null
  interactorLanguage?: string | null
  interactorTimeLimit?: number | null
  interactorMemoryLimit?: number | null
  interactorStackLimit?: number | null
  interactorOutputLimit?: number | null
  interactorProtocol?: string | null
  isRemoveEndBlank?: boolean | null
  openCaseResult?: boolean | null
}

/** 对应后端 AddProblemRequest / UpdateProblemRequest */
export interface AdminProblemPayload {
  problem: AdminProblemRequest
  tags: string[]
}

/** 对应后端 AdminProblemListVo */
export interface AdminProblemListVo {
  id: number
  problemCode: string
  title: string
  author: string | null
  auth: number | null
  type: number | null
  difficulty: number | null
  tags: string[] | null
  submissionCount: number | null
  acceptedCount: number | null
  scorePercentage: number | null
  createTime: string | null
  updateTime: string | null
}

/** 对应后端 AdminProblemDetailVo */
export interface AdminProblemDetailVo {
  problem: AdminProblemRequest
  tags: string[] | null
}

export interface AdminProblemListQuery {
  page: number
  pageSize: number
  keyword?: string
  auth?: number | null
}

export function getAdminProblemList(query: AdminProblemListQuery): Promise<PageVo<AdminProblemListVo>> {
  return get<PageVo<AdminProblemListVo>>('/api/admin/problem/list', {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword?.trim() || undefined,
    auth: query.auth ?? undefined,
  })
}

export function getAdminProblemDetail(id: number): Promise<AdminProblemDetailVo> {
  return get<AdminProblemDetailVo>(`/api/admin/problem/${id}`)
}

export function createAdminProblem(payload: AdminProblemPayload): Promise<null> {
  return post<null>('/api/admin/problem', payload)
}

export function updateAdminProblem(payload: AdminProblemPayload): Promise<null> {
  return put<null>('/api/admin/problem', payload)
}

export function deleteAdminProblem(pid: number): Promise<null> {
  return del<null>('/api/admin/problem', { pid })
}

export function updateAdminProblemAuth(pid: number, auth: number): Promise<null> {
  return put<null>('/api/admin/problem/auth', { pid, auth })
}

export function uploadAdminProblemTestdata(problemId: number, file: File): Promise<null> {
  const form = new FormData()
  form.append('file', file)
  return post<null>(`/api/admin/problem/${problemId}/testdata`, form)
}

export function uploadAdminProblemImage(problemId: number, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  return post<string>(`/api/admin/problem/${problemId}/images`, form)
}

export function deleteAdminProblemImage(problemId: number, filename: string): Promise<null> {
  return del<null>(`/api/admin/problem/${problemId}/images/${encodeURIComponent(filename)}`)
}

// --------------------------------------------------
// 讨论管理（AdminDiscussionController）
// --------------------------------------------------

/** 对应后端 AdminDiscussionListVo */
export interface AdminDiscussionListVo {
  id: number
  title: string
  uid: string | null
  author: string | null
  category: string | null
  problemCode: string | null
  status: number | null
  topPriority: number | null
  viewNum: number | null
  likeNum: number | null
  answerCount: number | null
  gmtCreate: string | null
  gmtModified: string | null
}

/** 对应后端 AdminUpdateDiscussionRequest，字段与 DTO 一一对应 */
export interface AdminDiscussionUpdatePayload {
  title: string
  category: string
  problemCode?: string | null
  content: string
  /** 0 正常 / 1 关闭 */
  status: number
  isTop: boolean
}

export interface AdminDiscussionQuery {
  page: number
  pageSize: number
  keyword?: string
  category?: string | null
  status?: number | null
}

export function getAdminDiscussions(query: AdminDiscussionQuery): Promise<PageVo<AdminDiscussionListVo>> {
  return get<PageVo<AdminDiscussionListVo>>('/api/admin/discussions', {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword?.trim() || undefined,
    category: query.category ?? undefined,
    status: query.status ?? undefined,
  })
}

/** 对应后端 AdminDiscussionDetailVo：管理端复用的受保护详情，可读已关闭讨论且不计浏览量 */
export interface AdminDiscussionDetailVo {
  id: number
  title: string
  category: string
  problemCode: string | null
  content: string
  /** 0 正常 / 1 关闭 */
  status: number
  isTop: boolean
}

export function getAdminDiscussionDetail(id: number): Promise<AdminDiscussionDetailVo> {
  return get<AdminDiscussionDetailVo>(`/api/admin/discussions/${id}`)
}

export function updateAdminDiscussion(id: number, payload: AdminDiscussionUpdatePayload): Promise<null> {
  return put<null>(`/api/admin/discussions/${id}`, payload)
}

export function deleteAdminDiscussion(id: number): Promise<null> {
  return del<null>(`/api/admin/discussions/${id}`)
}

// --------------------------------------------------
// 公告管理（AdminAnnouncementController）
// --------------------------------------------------

/** 对应后端 AnnouncementListVo */
export interface AdminAnnouncementListVo {
  id: number
  title: string
  uid: string | null
  status: number | null
  /** ANNOUNCEMENT / NEWS；后端按记录实际存储的分类返回 */
  category?: string | null
  gmtCreate: string | null
  gmtModified: string | null
}

/** 对应后端 AnnouncementDetailVo */
export interface AdminAnnouncementDetailVo extends AdminAnnouncementListVo {
  content: string | null
}

/** 对应后端 AnnouncementCreateRequest / AnnouncementUpdateRequest */
export interface AdminAnnouncementPayload {
  title: string
  content: string
  /** 0 下线 / 1 上线 */
  status: number
  /** 缺省 ANNOUNCEMENT；编辑缺省/空白保留原分类 */
  category?: string | null
}

export interface AdminAnnouncementQuery {
  page: number
  pageSize: number
  keyword?: string
  status?: number | null
  category?: string | null
}

export function getAdminAnnouncements(
  query: AdminAnnouncementQuery,
): Promise<PageVo<AdminAnnouncementListVo>> {
  return get<PageVo<AdminAnnouncementListVo>>('/api/admin/announcements', {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword?.trim() || undefined,
    status: query.status ?? undefined,
    category: query.category || undefined,
  })
}

/** 管理端受保护详情：上线/下线公告均可读取真实 content/status */
export function getAdminAnnouncementDetail(id: number): Promise<AdminAnnouncementDetailVo> {
  return get<AdminAnnouncementDetailVo>(`/api/admin/announcements/${id}`)
}

export function createAdminAnnouncement(payload: AdminAnnouncementPayload): Promise<null> {
  return post<null>('/api/admin/announcements', payload)
}

export function updateAdminAnnouncement(id: number, payload: AdminAnnouncementPayload): Promise<null> {
  return put<null>(`/api/admin/announcements/${id}`, payload)
}

export function deleteAdminAnnouncement(id: number): Promise<null> {
  return del<null>(`/api/admin/announcements/${id}`)
}

export function updateAdminAnnouncementStatus(id: number, status: number): Promise<null> {
  return put<null>(`/api/admin/announcements/${id}/status`, { status })
}

// --------------------------------------------------
// 判题 outbox（AdminSubmissionController）
// --------------------------------------------------

/** 对应后端 JudgeTaskOutboxVo */
export interface JudgeTaskOutboxVo {
  id: number
  messageId: string | null
  judgeTaskId: string | null
  submissionId: string | null
  /** pending / processing / sent / failed / exhausted */
  status: string | null
  retryCount: number | null
  publishAttempt: number | null
  maxRetryCount: number | null
  nextRetryTime: string | null
  sentTime: string | null
  lastError: string | null
  gmtCreate: string | null
  gmtModified: string | null
}

export interface JudgeTaskOutboxQuery {
  page: number
  pageSize: number
  status?: string | null
  submissionId?: string
  judgeTaskId?: string
}

export function getJudgeOutbox(query: JudgeTaskOutboxQuery): Promise<PageVo<JudgeTaskOutboxVo>> {
  return get<PageVo<JudgeTaskOutboxVo>>('/api/admin/submissions/judge-outbox', {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status ?? undefined,
    submissionId: query.submissionId?.trim() || undefined,
    judgeTaskId: query.judgeTaskId?.trim() || undefined,
  })
}

export function retryJudgeOutbox(id: number): Promise<null> {
  return post<null>(`/api/admin/submissions/judge-outbox/${id}/retry`)
}

// --------------------------------------------------
// 比赛管理（AdminContestController，管理员）
// 字段以后端 AdminContestListVo / AdminContestDetailVo / AdminContestSaveRequest 为准。
// --------------------------------------------------

/** 对应后端 AdminContestProblemRequest：problemId 为内部数字 ID，displayId 为 A/B 字符串 */
export interface AdminContestProblemPayload {
  problemId: number
  displayId?: string | null
  displayTitle?: string | null
  color?: string | null
}

/** 对应后端 AdminContestSaveRequest：startTime/endTime 为毫秒 epoch，status 为布尔 */
export interface AdminContestSaveRequest {
  title: string
  /** 仅支持 ACM / OI */
  type: string
  /** 仅支持 Public / Private */
  auth: string
  source?: string | null
  customTags?: string[]
  status: boolean
  startTime: number
  endTime: number
  description?: string | null
  rankShowName?: string | null
  openRank?: boolean | null
  sealRank?: boolean | null
  sealRankTime?: number | null
  problems?: AdminContestProblemPayload[]
  accountList?: string[]
}

/** 对应后端 AdminContestListVo */
export interface AdminContestListVo {
  id: number
  title: string
  startTime: string | null
  endTime: string | null
  type: string | null
  auth: string | null
  permission: string | null
  source: string | null
  author: string | null
  status: boolean | null
  runtimeStatus: string | null
  problemCount: number | null
  customTags: string[] | null
}

/** 对应后端 AdminContestAccountVo */
export interface AdminContestAccountVo {
  uid: string
  username: string | null
}

/** 对应后端 AdminContestDetailVo：timeRange 为 [开始ms, 结束ms] */
export interface AdminContestDetailVo {
  id: number
  uid: string | null
  author: string | null
  title: string
  description: string | null
  type: string | null
  auth: string | null
  permission: string | null
  source: string | null
  status: boolean | null
  startTime: string | null
  endTime: string | null
  timeRange: number[] | null
  runtimeStatus: string | null
  rankShowName: string | null
  openRank: boolean | null
  sealRank: boolean | null
  sealRankTime: string | null
  customTags: string[] | null
  problems: ContestProblemVo[] | null
  accountList: AdminContestAccountVo[] | null
  gmtCreate: string | null
  gmtModified: string | null
}

export interface AdminContestListQuery {
  page: number
  pageSize: number
  keyword?: string
}

export function getAdminContests(query: AdminContestListQuery): Promise<PageVo<AdminContestListVo>> {
  return get<PageVo<AdminContestListVo>>('/api/admin/contest/list', {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword?.trim() || undefined,
  })
}

export function getAdminContestDetail(id: number | string): Promise<AdminContestDetailVo> {
  return get<AdminContestDetailVo>(`/api/admin/contest/${encodeURIComponent(String(id))}`)
}

export function createAdminContest(payload: AdminContestSaveRequest): Promise<null> {
  return post<null>('/api/admin/contest', payload)
}

export function updateAdminContest(id: number | string, payload: AdminContestSaveRequest): Promise<null> {
  return put<null>(`/api/admin/contest/${encodeURIComponent(String(id))}`, payload)
}

export function deleteAdminContest(id: number | string): Promise<null> {
  return del<null>('/api/admin/contest', undefined, { query: { id } })
}

export function updateAdminContestStatus(id: number | string, status: boolean): Promise<null> {
  return put<null>('/api/admin/contest/status', { id, status })
}

/** 对应后端 AdminContestTeamListVo */
export interface AdminContestTeamListVo {
  id: number
  cid: number | null
  name: string
  member1Uid: string | null
  member1Name: string | null
  member2Uid: string | null
  member2Name: string | null
  member3Uid: string | null
  member3Name: string | null
  createTime: string | null
}

/** 对应后端 AdminContestTeamSaveRequest：member1Uid 必填（队长） */
export interface AdminContestTeamSaveRequest {
  cid?: number | null
  name: string
  member1Uid: string
  member2Uid?: string | null
  member3Uid?: string | null
}

export function getAdminContestTeams(
  cid: number | string,
  page: number,
  pageSize: number,
): Promise<PageVo<AdminContestTeamListVo>> {
  return get<PageVo<AdminContestTeamListVo>>('/api/admin/contest/team', {
    cid,
    page,
    pageSize,
  })
}

export function createAdminContestTeam(payload: AdminContestTeamSaveRequest): Promise<null> {
  return post<null>('/api/admin/contest/team', payload)
}

export function updateAdminContestTeam(
  id: number | string,
  payload: AdminContestTeamSaveRequest,
): Promise<null> {
  return put<null>(`/api/admin/contest/team/${encodeURIComponent(String(id))}`, payload)
}

export function deleteAdminContestTeam(id: number | string): Promise<null> {
  return del<null>(`/api/admin/contest/team/${encodeURIComponent(String(id))}`)
}

export function batchDeleteAdminContestTeams(ids: Array<number | string>): Promise<null> {
  return del<null>('/api/admin/contest/team', { ids })
}

// --------------------------------------------------
// 题单管理（AdminTrainingController，管理员）
// 字段以后端 AdminTrainingListVo / AdminTrainingDetailVo / AdminTrainingSaveRequest 为准。
// --------------------------------------------------

/** 对应后端 AdminTrainingProblemRequest：displayId 为 Integer>=1，不能使用比赛的 A/B */
export interface AdminTrainingProblemPayload {
  problemId: number
  displayId?: number | null
}

/** 对应后端 AdminTrainingSaveRequest：type 仅 Official/User，auth 仅 Public/Private */
export interface AdminTrainingSaveRequest {
  title: string
  type: string
  auth?: string | null
  privatePwd?: string | null
  description?: string | null
  status: boolean
  rank?: number | null
  problems?: AdminTrainingProblemPayload[]
}

/** 对应后端 AdminTrainingListVo */
export interface AdminTrainingListVo {
  id: number
  title: string
  type: string | null
  auth: string | null
  author: string | null
  status: boolean | null
  rank: number | null
  problemCount: number | null
  gmtCreate: string | null
}

/** 对应后端 AdminTrainingDetailVo（受保护完整详情，含 privatePwd/description 与有序题目） */
export interface AdminTrainingDetailVo {
  id: number
  title: string
  type: string | null
  auth: string | null
  privatePwd: string | null
  description: string | null
  status: boolean | null
  rank: number | null
  problems: AdminTrainingProblemPayload[] | null
}

export interface AdminTrainingListQuery {
  page: number
  pageSize: number
  keyword?: string
  type?: string
  auth?: string
  status?: boolean | null
}

export function getAdminTrainings(
  query: AdminTrainingListQuery,
): Promise<PageVo<AdminTrainingListVo>> {
  return get<PageVo<AdminTrainingListVo>>('/api/admin/training/list', {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword?.trim() || undefined,
    type: query.type || undefined,
    auth: query.auth || undefined,
    status: query.status ?? undefined,
  })
}

/** 受保护完整详情：停用/私有题单也可编辑，返回 privatePwd 与全部有序题目 */
export function getAdminTrainingDetail(id: number | string): Promise<AdminTrainingDetailVo> {
  return get<AdminTrainingDetailVo>(`/api/admin/training/${encodeURIComponent(String(id))}`)
}

export function createAdminTraining(payload: AdminTrainingSaveRequest): Promise<null> {
  return post<null>('/api/admin/training', payload)
}

export function updateAdminTraining(id: number | string, payload: AdminTrainingSaveRequest): Promise<null> {
  return put<null>(`/api/admin/training/${encodeURIComponent(String(id))}`, payload)
}

export function deleteAdminTraining(id: number | string): Promise<null> {
  return del<null>('/api/admin/training', undefined, { query: { id } })
}

export function updateAdminTrainingStatus(id: number | string, status: boolean): Promise<null> {
  return put<null>('/api/admin/training/status', { id, status })
}

// --------------------------------------------------
// 作业管理（AdminHomeworkController，管理员）
// 字段以后端 AdminHomeworkListVo / AdminHomeworkDetailVo / AdminHomeworkSaveRequest 为准。
// --------------------------------------------------

/** 对应后端 AdminHomeworkProblemRequest：displayId 为字符串（A/B/AA） */
export interface AdminHomeworkProblemPayload {
  problemId: number
  displayId?: string | null
}

/** 对应后端 AdminHomeworkSaveRequest：classIds 为数字数组，startTime/endTime 为毫秒 epoch */
export interface AdminHomeworkSaveRequest {
  title: string
  source?: string | null
  status: boolean
  startTime: number
  endTime: number
  description?: string | null
  classIds: number[]
  problems?: AdminHomeworkProblemPayload[]
}

/** 对应后端 AdminHomeworkListVo */
export interface AdminHomeworkListVo {
  id: number
  title: string
  source: string | null
  author: string | null
  status: boolean | null
  startTime: string | null
  endTime: string | null
  problemCount: number | null
  classCount: number | null
  gmtCreate: string | null
}

/** 对应后端 AdminHomeworkDetailVo：classIds 为数字数组，timeRange 为 [开始ms, 结束ms] */
export interface AdminHomeworkDetailVo {
  id: number
  title: string
  description: string | null
  source: string | null
  author: string | null
  status: boolean | null
  startTime: string | null
  endTime: string | null
  timeRange: number[] | null
  classIds: number[] | null
  problems: HomeworkProblemVo[] | null
  gmtCreate: string | null
  gmtModified: string | null
}

export interface AdminHomeworkListQuery {
  page: number
  pageSize: number
  keyword?: string
}

export function getAdminHomeworks(
  query: AdminHomeworkListQuery,
): Promise<PageVo<AdminHomeworkListVo>> {
  return get<PageVo<AdminHomeworkListVo>>('/api/admin/homework/list', {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword?.trim() || undefined,
  })
}

export function getAdminHomeworkDetail(id: number | string): Promise<AdminHomeworkDetailVo> {
  return get<AdminHomeworkDetailVo>(`/api/admin/homework/${encodeURIComponent(String(id))}`)
}

export function createAdminHomework(payload: AdminHomeworkSaveRequest): Promise<null> {
  return post<null>('/api/admin/homework', payload)
}

export function updateAdminHomework(id: number | string, payload: AdminHomeworkSaveRequest): Promise<null> {
  return put<null>(`/api/admin/homework/${encodeURIComponent(String(id))}`, payload)
}

export function deleteAdminHomework(id: number | string): Promise<null> {
  return del<null>('/api/admin/homework', undefined, { query: { id } })
}

export function updateAdminHomeworkStatus(id: number | string, status: boolean): Promise<null> {
  return put<null>('/api/admin/homework/status', { id, status })
}

// --------------------------------------------------
// 管理通知 / 本人站内消息 / 自助资料 / 资料变更申请（user 服务）
// 字段以后端 DTO/VO 为准。
// --------------------------------------------------

/** targetType：USERS 目标为 uid，CLASSES 目标为班级 id 字符串 */
export type NoticeTargetType = 'USERS' | 'CLASSES'
/** status：DRAFT 草稿可编辑；PUBLISHED 已发布不可再编辑正文/目标 */
export type NoticeStatus = 'DRAFT' | 'PUBLISHED'

/** 对应后端 UserNoticeListVo */
export interface NoticeListVo {
  id: number
  title: string
  targetType: NoticeTargetType | null
  status: NoticeStatus | null
  creatorUid: string | null
  publishedAt: string | null
  gmtCreate: string | null
  gmtModified: string | null
}

/** 对应后端 UserNoticeDetailVo（含已保存目标） */
export interface NoticeDetailVo extends NoticeListVo {
  content: string
  targetIds: string[]
}

/** 对应后端 NoticeSaveRequest */
export interface NoticePayload {
  title: string
  content: string
  targetType: NoticeTargetType
  targetIds: string[]
}

export interface NoticeListQuery {
  page: number
  pageSize: number
  keyword?: string
  status?: NoticeStatus | null
}

export function getAdminNotices(query: NoticeListQuery): Promise<PageVo<NoticeListVo>> {
  return get<PageVo<NoticeListVo>>('/api/admin/notices', {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword?.trim() || undefined,
    status: query.status || undefined,
  })
}

export function getAdminNoticeDetail(id: number | string): Promise<NoticeDetailVo> {
  return get<NoticeDetailVo>(`/api/admin/notices/${encodeURIComponent(String(id))}`)
}

/** 创建通知草稿，返回后端生成的通知 id（仅保存为 DRAFT，不投递） */
export function createAdminNotice(payload: NoticePayload): Promise<number> {
  return post<number>('/api/admin/notices', payload)
}

export function updateAdminNotice(id: number | string, payload: NoticePayload): Promise<null> {
  return put<null>(`/api/admin/notices/${encodeURIComponent(String(id))}`, payload)
}

export function deleteAdminNotice(id: number | string): Promise<null> {
  return del<null>(`/api/admin/notices/${encodeURIComponent(String(id))}`)
}

export function publishAdminNotice(id: number | string): Promise<null> {
  return post<null>(`/api/admin/notices/${encodeURIComponent(String(id))}/publish`)
}

/** 对应后端 UserMessageVo（不含收件人集合/通知目标） */
export interface UserMessageVo {
  id: number
  noticeId: number | null
  title: string
  content: string
  readAt: string | null
  createdAt: string | null
}

/** 本人收件箱分页；unread=true 仅返回未读 */
export function getUserMessages(
  page: number,
  pageSize: number,
  unread?: boolean,
): Promise<PageVo<UserMessageVo>> {
  return get<PageVo<UserMessageVo>>('/api/user/messages', {
    page,
    pageSize,
    unread: unread ? true : undefined,
  })
}

export function getUserMessageUnreadCount(): Promise<number> {
  return get<number>('/api/user/messages/unread-count')
}

export function markUserMessageRead(id: number | string): Promise<null> {
  return put<null>(`/api/user/messages/${encodeURIComponent(String(id))}/read`)
}

export function markAllUserMessagesRead(): Promise<null> {
  return put<null>('/api/user/messages/read-all')
}

export function deleteUserMessage(id: number | string): Promise<null> {
  return del<null>(`/api/user/messages/${encodeURIComponent(String(id))}`)
}

/**
 * 对应后端 UpdateUserProfileRequest。
 * 只包含白名单字段；未传（undefined）保留原值，空字符串清除可选项（username 除外）。
 */
export interface UserProfileUpdatePayload {
  username?: string
  avatar?: string
  qq?: string
  github?: string
  blog?: string
}

export function updateUserProfile(payload: UserProfileUpdatePayload): Promise<null> {
  return put<null>('/api/user/profile', payload)
}

/** 本人自助修改密码：后端校验旧密码，成功后服务端失效全部旧会话 */
export function changeUserPassword(payload: {
  oldPassword: string
  newPassword: string
}): Promise<null> {
  return put<null>('/api/user/password', payload)
}

/** 资料变更申请状态 */
export type ProfileChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * 对应后端 ProfileSnapshotVo：资料变更申请的原值/目标值快照。
 *
 * 同一个按 id 审批的流程受理身份字段与联系/社交字段；快照里缺失的字段为 null，
 * 两侧同为 null 表示「未申请变更」。
 */
export interface ProfileChangeSnapshot {
  realname: string | null
  collegeId: number | null
  grade: string | null
  classId: number | null
  username: string | null
  email: string | null
  phone: string | null
  avatar: string | null
  qq: string | null
  cfUsername: string | null
  github: string | null
  blog: string | null
}

/** 快照字段清单与中文名：列表/详情只展示「真正发生变化的字段」，顺序与后端 ProfileChangeField 一致 */
export const PROFILE_CHANGE_FIELDS: { key: keyof ProfileChangeSnapshot; label: string }[] = [
  { key: 'realname', label: '实名' },
  { key: 'collegeId', label: '学院' },
  { key: 'grade', label: '年级' },
  { key: 'classId', label: '班级' },
  { key: 'username', label: '用户名' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机号' },
  { key: 'avatar', label: '头像' },
  { key: 'qq', label: 'QQ' },
  { key: 'cfUsername', label: 'Codeforces' },
  { key: 'github', label: 'GitHub' },
  { key: 'blog', label: '博客' },
]

/** 对应后端 ProfileChangeVo */
export interface ProfileChangeVo {
  id: number
  uid: string
  original: ProfileChangeSnapshot | null
  proposed: ProfileChangeSnapshot | null
  reason: string
  status: ProfileChangeStatus | null
  reviewerUid: string | null
  reviewReason: string | null
  reviewAt: string | null
  gmtCreate: string | null
  gmtModified: string | null
}

/**
 * 对应后端 ProfileChangeCreateRequest：**只提交需要变更的字段**，未提交或与当前值相同的字段不进入申请。
 * 身份字段在「确实要改身份字段」时才需要成组出现。
 */
export interface ProfileChangePayload {
  realname?: string
  collegeId?: number
  grade?: string
  classId?: number
  username?: string
  email?: string
  phone?: string
  avatar?: string
  qq?: string
  cfUsername?: string
  github?: string
  blog?: string
  reason: string
}

export function submitProfileChangeRequest(payload: ProfileChangePayload): Promise<null> {
  return post<null>('/api/user/profile-change-requests', payload)
}

/** 本人申请列表（仅本人；uid 由服务端登录态决定） */
export function getMyProfileChangeRequests(
  page: number,
  pageSize: number,
): Promise<PageVo<ProfileChangeVo>> {
  return get<PageVo<ProfileChangeVo>>('/api/user/profile-change-requests', { page, pageSize })
}

export interface AdminProfileChangeQuery {
  page: number
  pageSize: number
  status?: ProfileChangeStatus | null
  keyword?: string
}

export function getAdminProfileChangeRequests(
  query: AdminProfileChangeQuery,
): Promise<PageVo<ProfileChangeVo>> {
  return get<PageVo<ProfileChangeVo>>('/api/admin/profile-change-requests', {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status || undefined,
    keyword: query.keyword?.trim() || undefined,
  })
}

export function approveProfileChangeRequest(
  id: number | string,
  reason?: string,
): Promise<null> {
  return post<null>(`/api/admin/profile-change-requests/${encodeURIComponent(String(id))}/approve`, {
    reason: reason || undefined,
  })
}

export function rejectProfileChangeRequest(id: number | string, reason: string): Promise<null> {
  return post<null>(`/api/admin/profile-change-requests/${encodeURIComponent(String(id))}/reject`, {
    reason,
  })
}

/** 批量审核通过（按申请 id）；单条失败不影响其它条目，结果里分别返回成功数与失败原因 */
export function batchApproveProfileChangeRequests(
  ids: number[],
): Promise<{ successCount: number; failedCount: number; failures: { id: string; reason: string }[] }> {
  return post('/api/admin/profile-change-requests/batch-approve', { ids })
}
