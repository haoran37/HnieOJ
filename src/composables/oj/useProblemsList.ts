import { ref } from 'vue'
import type { ProblemRow, ProblemSearchParams } from '@/types/problem'
import { toProblemRow } from '@/types/problem'
import { getProblemList } from '@/utils/api'

const defaultSearchParams: ProblemSearchParams = {
  keyword: '',
  tags: [],
  difficulty: null,
}

export function useProblemsList() {
  const tableData = ref<ProblemRow[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(30)
  const searchParams = ref<ProblemSearchParams>({ ...defaultSearchParams })

  // 局部请求序号：分页/筛选连续触发时，旧响应不得覆盖新查询
  let seq = 0

  const fetchProblems = async () => {
    const current = ++seq
    loading.value = true
    error.value = null
    try {
      const result = await getProblemList(page.value, pageSize.value, searchParams.value)
      if (current !== seq) return
      tableData.value = (result?.list ?? []).map(toProblemRow)
      total.value = result?.total ?? 0
    } catch (err) {
      if (current !== seq) return
      tableData.value = []
      total.value = 0
      error.value = err instanceof Error ? err.message : '题目列表加载失败'
    } finally {
      if (current === seq) loading.value = false
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
    error,
    total,
    page,
    pageSize,
    searchParams,
    fetchProblems,
    updateSearch,
    handlePageChange,
  }
}
