import { ref } from 'vue'
import type { ProblemRow, ProblemSearchParams } from '@/types/problem'
import { sleep } from '@/utils/mock'

const defaultSearchParams: ProblemSearchParams = {
  keyword: '',
  source: ['HNIE'],
  tags: [],
  difficulty: '',
  searchInContent: false,
}

const difficultyPool = ['入门', '简单', '中等', '困难']
const tagPool = ['动态规划', '数学', '字符串', 'KMP', '图论', '贪心']
const fallbackDifficulty = '入门'
const fallbackTags = ['动态规划', '数学'] as const

const buildMockRows = (page: number, pageSize: number): ProblemRow[] => {
  return Array.from({ length: pageSize }, (_, index) => {
    const id = 1000 + (page - 1) * pageSize + index + 1
    const titlePrefix = index % 3 === 0 ? 'A+B Problem' : 'Algorithm Practice'
    const difficulty = difficultyPool[index % difficultyPool.length] ?? fallbackDifficulty
    const firstTag = tagPool[index % tagPool.length] ?? fallbackTags[0]
    const secondTag = tagPool[(index + 1) % tagPool.length] ?? fallbackTags[1]

    return {
      id: String(id),
      title: `${titlePrefix} ${id}`,
      difficulty,
      tags: [firstTag, secondTag],
      passRate: Math.floor(Math.random() * 100),
      rate: (Math.random() * 5).toFixed(1),
    }
  })
}

export function useProblemsList() {
  const tableData = ref<ProblemRow[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(30)
  const searchParams = ref<ProblemSearchParams>({ ...defaultSearchParams })

  const fetchProblems = async () => {
    loading.value = true
    try {
      // TODO: Replace with real API request.
      await sleep(400)
      tableData.value = buildMockRows(page.value, pageSize.value)
      total.value = 14859
    } finally {
      loading.value = false
    }
  }

  const updateSearch = (params: Partial<ProblemSearchParams>) => {
    searchParams.value = { ...searchParams.value, ...params }
    page.value = 1
    void fetchProblems()
  }

  const handlePageChange = (targetPage: number) => {
    page.value = targetPage
    void fetchProblems()
  }

  return {
    tableData,
    loading,
    total,
    page,
    pageSize,
    searchParams,
    fetchProblems,
    updateSearch,
    handlePageChange,
  }
}
