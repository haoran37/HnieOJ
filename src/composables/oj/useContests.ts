import { ref } from 'vue';
import { getContests, type ContestListVo } from '@/utils/api';

export type ContestTypeFilter = 'ALL' | 'ACM' | 'OI';

// 比赛视图模型：字段来自后端 ContestListVo，不做自造
export interface Contest {
  id: string;
  title: string;
  tags: string[];
  source: string;
  beginTime: string;
  endTime: string;
  problemCount: number;
  type: string;
  status: string;
}

function toContest(vo: ContestListVo): Contest {
  return {
    id: String(vo.id),
    title: vo.title,
    tags: vo.customTags ?? [],
    source: vo.source ?? '',
    beginTime: vo.startTime ?? '',
    endTime: vo.endTime ?? '',
    problemCount: vo.problemCount ?? 0,
    type: vo.type ?? '',
    status: vo.status ?? '',
  };
}

export function useContests() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeTab = ref<ContestTypeFilter>('ALL');
  const page = ref(1);
  const pageSize = ref(10);
  const total = ref(0);
  const contestList = ref<Contest[]>([]);

  // 局部请求序号：旧响应不得覆盖新查询
  let seq = 0;

  const fetchContests = async () => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await getContests(
        page.value,
        pageSize.value,
        activeTab.value === 'ALL' ? undefined : activeTab.value,
      );
      if (current !== seq) return;
      contestList.value = (result?.list ?? []).map(toContest);
      total.value = result?.total ?? 0;
    } catch (err) {
      if (current !== seq) return;
      contestList.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '比赛列表加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  const handleTabChange = (tab: ContestTypeFilter) => {
    activeTab.value = tab;
    page.value = 1;
    void fetchContests();
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    void fetchContests();
  };

  return {
    loading,
    error,
    activeTab,
    page,
    pageSize,
    total,
    contestList,
    fetchContests,
    handleTabChange,
    handlePageChange,
  };
}
