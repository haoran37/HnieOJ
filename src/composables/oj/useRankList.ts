import { ref } from 'vue';

export interface RankUser {
  rank: number;
  studentId: string;
  className: string;
  name: string;
  solved: number;
  submitted: number;
  acceptanceRate: string; // 比率
  duplicateRate: string;  // 重复率
}

export function useRankList() {
  const loading = ref(false);
  const listData = ref<RankUser[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  //TODO: 替换真实api
  const fetchRankList = async (params: any) => {
    loading.value = true;
    console.log("Searching Rank with:", params);

    setTimeout(() => {
      listData.value = Array.from({ length: pageSize.value }, (_, i) => {
        const rank = (page.value - 1) * pageSize.value + i + 1;
        const solved = Math.floor(600 - rank * 5 + Math.random() * 10);
        const submitted = Math.floor(solved * (1.5 + Math.random()));
        
        const classNames = ['计算机2101', '人工智能2102', '软件工程2101'];

        return {
          rank: rank,
          studentId: `20210${3010100 + i}`,
          className: classNames[i % 3] as string,
          name: '某某某',
          solved: solved,
          submitted: submitted,
          acceptanceRate: ((solved / submitted) * 100).toFixed(2) + '%',
          duplicateRate: (Math.random() * 30).toFixed(2) + '%'
        };
      });
      total.value = 458;
      loading.value = false;
    }, 400);
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    // 重新调用 fetch，带上当前的筛选参数
  };

  return {
    loading,
    listData,
    total,
    page,
    pageSize,
    fetchRankList,
    handlePageChange
  };
}