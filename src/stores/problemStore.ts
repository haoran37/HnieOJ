import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useProblemStore = defineStore('problem', () => {
  const tableData = ref<any[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(30);

  // 搜索条件 (从 Filter 组件同步过来)
  const searchParams = ref({
    keyword: '',
    source: 'HNIE',
    tags: [] as string[],
    difficulty: ''
  });

  // 核心：获取题目列表
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
        // 模拟生成 50 条数据
        tableData.value = Array.from({ length: 30 }, (_, i) => {
          const id = 1000 + (page.value - 1) * 50 + i + 1;
          return {
            id: String(id),
            title: i % 3 === 0 ? `A+B Problem ${id}` : `复杂的动态规划 ${id}`,
            difficulty: ['入门', '简单', '普及-', '普及/提高-', '困难'][i % 5],
            tags: i % 2 === 0 ? ['动态规划', '数学'] : ['字符串', 'KMP'],
            passRate: Math.floor(Math.random() * 100),
            rate: (Math.random() * 5).toFixed(1) // 评分
          };
        });
        total.value = 14859; // 模拟总数
        loading.value = false;
      }, 600);
    } catch (error) {
      console.error(error);
      loading.value = false;
    }
  };

  // 供 Filter 组件调用的动作
  const updateSearch = (params: any) => {
    searchParams.value = { ...searchParams.value, ...params };
    page.value = 1;
    fetchProblems();
  };

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
    fetchProblems, 
    updateSearch, 
    handlePageChange 
  };
});