// 题目相关类型：字段以后端 ProblemListVo / ProblemDetailVo / ProblemCheckVo 为准。

export interface ProblemSearchParams {
  keyword: string
  tags: string[]
  difficulty: number | null
}

/** 后端 PageVo<T> */
export interface PageVo<T> {
  list: T[]
  total: number
}

/** 对应后端 ProblemListVo */
export interface ProblemListVo {
  id: number
  problemCode: string
  title: string
  difficulty: number | null
  tags: string[] | null
  submissionCount: number | null
  acceptedCount: number | null
  scorePercentage: number | null
}

/** 对应后端 ProblemExampleVo */
export interface ProblemExampleVo {
  input: string | null
  output: string | null
}

/** 对应后端 ProblemDetailVo */
export interface ProblemDetailVo {
  id: number
  problemCode: string
  title: string
  author: string | null
  type: number | null
  judgeMode: string | null
  timeLimit: number | null
  memoryLimit: number | null
  stackLimit: number | null
  description: string | null
  input: string | null
  output: string | null
  examples: ProblemExampleVo[] | null
  hint: string | null
  difficulty: number | null
  ioScore: number | null
  isRemote: boolean | null
  source: string | null
  openCaseResult: boolean | null
  scorePercentage: number | null
  submissionCount: number | null
  acceptedCount: number | null
  gmtCreate: string | null
  gmtModified: string | null
}

/** 对应后端 ProblemCheckVo：problemId 为内部数字 ID，problemCode 为展示编号 */
export interface ProblemCheckVo {
  exists: boolean
  problemId: number | null
  problemCode: string | null
  title: string | null
}

/** 题目列表视图模型（表格用） */
export interface ProblemRow {
  /** 内部数字 ID，用于测试数据下载等内部接口 */
  id: number
  /** 展示编号，用于详情/提交/状态查询 */
  problemCode: string
  title: string
  difficulty: number | null
  tags: string[]
  submissionCount: number
  acceptedCount: number
  scorePercentage: number
  /** 通过率百分比（0-100），由 accepted/submission 计算 */
  passRate: number
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  0: '简单',
  1: '中等',
  2: '困难',
}

export function difficultyLabel(difficulty: number | null | undefined): string {
  if (difficulty === null || difficulty === undefined) return '未评级'
  return DIFFICULTY_LABELS[difficulty] ?? '未评级'
}

export function toProblemRow(vo: ProblemListVo): ProblemRow {
  const submissionCount = vo.submissionCount ?? 0
  const acceptedCount = vo.acceptedCount ?? 0
  const passRate = submissionCount > 0 ? Math.round((acceptedCount / submissionCount) * 1000) / 10 : 0
  return {
    id: vo.id,
    problemCode: vo.problemCode,
    title: vo.title,
    difficulty: vo.difficulty,
    tags: vo.tags ?? [],
    submissionCount,
    acceptedCount,
    scorePercentage: vo.scorePercentage ?? 0,
    passRate,
  }
}
