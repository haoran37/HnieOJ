import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formatAllTime } from './useContestTime';

// 提交记录接口
export interface Submission {
  id: string;          // Run ID
  studentId: string;   // 学号
  username: string;    // 用户名
  problemId: string;   // 题目 ID
  problemTitle: string;// 题目名称
  status: string;      // 判题状态
  language: string;    // 语言
  time: string;        // 耗时 (如 15ms)
  memory: string;      // 内存 (如 1464KB)
  submitTime: string;  // 提交时间
  contestId?: string;  // 比赛 ID (可选)
}

export function useStatusList() {
  const route = useRoute();
  const router = useRouter();

  const loading = ref(false);
  const listData = ref<Submission[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  // 筛选表单
  const filters = ref({
    problem: '', // 题目ID或名称
    user: '',    // 学号或用户名
    language: null as string | null,
    status: null as string | null
  });

  // 获取 URL 中的比赛 ID
  const contestId = ref(route.query.cid as string || '');

  const fetchStatus = async () => {
    loading.value = true;
    
    // 构造请求参数
    const params = {
      page: page.value,
      size: pageSize.value,
      ...filters.value,
      cid: contestId.value
    };

    console.log('Fetching Status:', params);

    // TODO: 替换真实api
    setTimeout(() => {
      // 模拟数据生成
      listData.value = Array.from({ length: 20 }, (_, i) => {
        const id = 8000 + i;
        const statusPool = [
          'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 
          'Memory Limit Exceeded', 'Compilation Error', 'Pending', 'Judging'
        ];
        
        const status = statusPool[Math.floor(Math.random() * statusPool.length)] as string;
        
        const languages = ['C', 'C++', 'Java', 'Python3', 'Go'];
        const language = languages[i % 3] as string;

        return {
          id: String(id),
          studentId: `20220${100 + i}`,
          username: `user_${id}`,
          problemId: String(1000 + (i % 5)),
          problemTitle: i % 2 === 0 ? 'A+B Problem' : 'Matrix Multiplication',
          status: status,
          language: language,
          time: status === 'Accepted' ? `${Math.floor(Math.random() * 500)} MS` : '--',
          memory: status === 'Accepted' ? `${Math.floor(Math.random() * 10000)} KB` : '--',
          submitTime: formatAllTime(),
          contestId: contestId.value || undefined
        };
      });
      total.value = 1450;
      loading.value = false;
    }, 400);
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    fetchStatus();
  };

  const handleSearch = () => {
    page.value = 1;
    fetchStatus();
  };

  const handleRefresh = () => {
    fetchStatus();
  };

  // 监听路由参数变化 (从比赛切回普通列表)
  watch(() => route.query.cid, (newCid) => {
    contestId.value = (newCid as string) || '';
    handleRefresh();
  });

  return {
    loading,
    listData,
    total,
    page,
    pageSize,
    filters,
    fetchStatus,
    handlePageChange,
    handleSearch,
    handleRefresh
  };
}