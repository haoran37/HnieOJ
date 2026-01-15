import { ref } from 'vue';

export function useProblemsList() {
  const tableData = ref<any[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(30);

  // 搜索参数状态
  const searchParams = ref({
    keyword: '',
    source: 'HNIE',
    tags: [] as string[],
    difficulty: '',
    searchInContent: false
  });

  // 获取题目列表
  const fetchProblems = async () => {
    loading.value = true;
    try {
      console.log('API Request:', { 
        page: page.value, 
        size: pageSize.value, 
        ...searchParams.value 
      });

      // TODO: 替换为真实 API 请求
      // const res = await api.get('/problems', { params: ... });

      // 模拟异步延迟
      setTimeout(() => {
        tableData.value = Array.from({ length: 30 }, (_, i) => {
          const id = 1000 + (page.value - 1) * 30 + i + 1;
          return {
            id: String(id),
            title: i % 3 === 0 ? `A+B Problem ${id}` : `复杂的动态规划 ${id}`,
            difficulty: ['入门', '简单', '普及-', '普及/提高-', '困难'][i % 5],
            tags: i % 2 === 0 ? ['动态规划', '数学'] : ['字符串', 'KMP'],
            passRate: Math.floor(Math.random() * 100),
            rate: (Math.random() * 5).toFixed(1)
          };
        });
        total.value = 14859;
        loading.value = false;
      }, 600);
    } catch (error) {
      console.error(error);
      loading.value = false;
    }
  };

  // 更新搜索条件
  const updateSearch = (params: any) => {
    searchParams.value = { ...searchParams.value, ...params };
    page.value = 1; // 重置到第一页
    fetchProblems();
  };

  // 翻页
  const handlePageChange = (p: number) => {
    page.value = p;
    fetchProblems();
  };

  return {
    tableData,
    loading,
    total,
    page,
    pageSize,
    searchParams,
    fetchProblems,
    updateSearch,
    handlePageChange
  };
}