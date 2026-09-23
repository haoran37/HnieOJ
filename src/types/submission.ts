// 提交相关类型：字段以后端 SubmitCodeRequest / SubmissionListItemVo /
// SubmissionDetailVo / SubmissionCaseVo 为准。

export interface SubmitCodeRequest {
  problemCode: string
  language: string
  code?: string
  contestId?: string
  homeworkId?: string
}

export interface SubmitCodeVo {
  submissionId: string
}

export interface SubmissionListQuery {
  page: number
  pageSize: number
  problemCode?: string
  language?: string
  status?: number
  contestId?: string
  uid?: string
}

/** 对应后端 SubmissionListItemVo */
export interface SubmissionListItemVo {
  submissionId: string
  problemCode: string
  uid: string | null
  username: string | null
  language: string
  status: number
  statusText: string | null
  time: number | null
  memory: number | null
  score: number | null
  contestId: number | null
  totalCase: number | null
  judgedCase: number | null
  currentCase: number | null
  gmtCreate: string | null
}

/** 对应后端 SubmissionDetailVo */
export interface SubmissionDetailVo {
  submissionId: string
  problemCode: string
  uid: string | null
  username: string | null
  language: string
  status: number
  statusText: string | null
  time: number | null
  memory: number | null
  score: number | null
  contestId: number | null
  totalCase: number | null
  judgedCase: number | null
  currentCase: number | null
  errorMessage: string | null
  diagnosticMessage: string | null
  judger: string | null
  code: string | null
  gmtCreate: string | null
  gmtModified: string | null
}

/** 对应后端 SubmissionCaseVo */
export interface SubmissionCaseVo {
  caseId: string
  status: number
  statusText: string | null
  time: number | null
  memory: number | null
  score: number | null
  inputData: string | null
  outputData: string | null
  userOutput: string | null
  gmtCreate: string | null
  gmtModified: string | null
}

/** 后端 SubmissionStatusConstant 对应关系 */
export const SUBMISSION_STATUS = {
  PENDING: -10,
  COMPILING: -9,
  RUNNING: -8,
  ACCEPTED: 0,
  RUNTIME_ERROR: 1,
  COMPILE_ERROR: 2,
  WRONG_ANSWER: 3,
  TIME_LIMIT_EXCEEDED: 4,
  MEMORY_LIMIT_EXCEEDED: 5,
  SYSTEM_ERROR: 6,
  JUDGEMENT_FAILED: 7,
  INVALID_INTERACTION: 8,
} as const

export const SUBMISSION_STATUS_TEXT: Record<number, string> = {
  [-10]: 'Pending',
  [-9]: 'Compiling',
  [-8]: 'Running',
  0: 'Accepted',
  1: 'Runtime Error',
  2: 'Compile Error',
  3: 'Wrong Answer',
  4: 'Time Limit Exceeded',
  5: 'Memory Limit Exceeded',
  6: 'System Error',
  7: 'Judgement Failed',
  8: 'Invalid Interaction',
}

export function submissionStatusText(status: number | null | undefined, fallback?: string | null): string {
  if (fallback) return fallback
  if (status === null || status === undefined) return 'Unknown'
  return SUBMISSION_STATUS_TEXT[status] ?? 'Unknown'
}

/** 是否仍处于判题中（需继续轮询） */
export function isJudgingStatus(status: number | null | undefined): boolean {
  return status === SUBMISSION_STATUS.PENDING || status === SUBMISSION_STATUS.COMPILING || status === SUBMISSION_STATUS.RUNNING
}
