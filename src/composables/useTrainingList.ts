import { ref } from 'vue';

export interface TrainingSheet {
  id: string;
  title: string;
  type: 'OFFICIAL' | 'USER'; // 官方 or 用户分享
  completion: number; // 完成度百分比 (0-100)
  acCount: number;    // 已完成数量
  totalCount: number; // 总题数
  favoriteCount: number; // 收藏数
  rating: number;     // 评分 (0-5)
  creator: string;    // 创建者
}

export function useTrainingList() {
  const tableData = ref<TrainingSheet[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  // 搜索参数
  const searchParams = ref({
    keyword: '',
    type: 'OFFICIAL' as 'OFFICIAL' | 'USER'
  });

  // TODO: 使用真实api
  // TODO: 传递用户Token，由后端计算已完成数量
  const fetchTrainingSheets = async () => {
    loading.value = true;
    try {
      console.log('Fetching Sheets:', { page: page.value, ...searchParams.value });
      
      // 模拟延迟（Gemini3真实太好用了）
      setTimeout(() => {
        // 模拟生成数据 (模拟后端返回已经计算好 acCount 的数据)
        tableData.value = Array.from({ length: 20 }, (_, i) => {
          const id = 100 + (page.value - 1) * 20 + i;
          const totalProbs = Math.floor(Math.random() * 30) + 5;
          const userAc = Math.floor(Math.random() * totalProbs);
          
          return {
            id: String(id),
            title: searchParams.value.type === 'OFFICIAL' 
              ? `【官方】算法入门第 ${id} 阶段` 
              : `Codeforces 上分题单 ${id}`,
            type: searchParams.value.type,
            acCount: userAc,
            totalCount: totalProbs,
            completion: Number(((userAc / totalProbs) * 100).toFixed(1)),
            favoriteCount: Math.floor(Math.random() * 10000),
            rating: Number((3 + Math.random() * 2).toFixed(1)), // 3.0 - 5.0
            creator: searchParams.value.type === 'OFFICIAL' ? 'HNIEOJ官方' : `User_${Math.floor(Math.random()*1000)}`
          };
        });
        
        total.value = 62; // 模拟总数
        loading.value = false;
      }, 500);
    } catch (error) {
      console.error(error);
      loading.value = false;
    }
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    fetchTrainingSheets();
  };

  const handleSearch = () => {
    page.value = 1;
    fetchTrainingSheets();
  };

  // 切换类型 (官方/用户)
  const toggleType = (type: 'OFFICIAL' | 'USER') => {
    searchParams.value.type = type;
    handleSearch();
  };

  return {
    tableData,
    loading,
    total,
    page,
    pageSize,
    searchParams,
    fetchTrainingSheets,
    handlePageChange,
    handleSearch,
    toggleType
  };
}