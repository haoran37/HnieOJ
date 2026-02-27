export interface ProblemRow {
  id: string
  title: string
  difficulty: string
  tags: string[]
  passRate: number
  rate: string
}

export interface ProblemSearchParams {
  keyword: string
  source: string[]
  tags: string[]
  difficulty: string
  searchInContent: boolean
}
