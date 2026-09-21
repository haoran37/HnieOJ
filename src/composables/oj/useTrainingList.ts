import { ref } from 'vue';
import { getTrainings, type TrainingListVo } from '@/utils/api';

export type TrainingTypeFilter = 'OFFICIAL' | 'USER';

export interface TrainingSheet {
  id: string;
  title: string;
  type: TrainingTypeFilter;
  problemCount: number;
  categories: string[];
  creator: string;
  gmtCreate: string;
}

function toType(raw: string | null): TrainingTypeFilter {
  return raw?.toLowerCase() === 'user' ? 'USER' : 'OFFICIAL';
}

function toSheet(vo: TrainingListVo): TrainingSheet {
  return {
    id: String(vo.id),
    title: vo.title,
    type: toType(vo.type),
    problemCount: vo.problemCount ?? 0,
    categories: vo.categories ?? [],
    creator: vo.author ?? '',
    gmtCreate: vo.gmtCreate ?? '',
  };
}

export function useTrainingList() {
  const tableData = ref<TrainingSheet[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  const searchParams = ref({
    keyword: '',
    type: 'OFFICIAL' as TrainingTypeFilter,
  });

  let seq = 0;

  const fetchTrainingSheets = async () => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await getTrainings(
        page.value,
        pageSize.value,
        searchParams.value.keyword,
        searchParams.value.type === 'OFFICIAL' ? 'Official' : 'User',
      );
      if (current !== seq) return;
      tableData.value = (result?.list ?? []).map(toSheet);
      total.value = result?.total ?? 0;
    } catch (err) {
      if (current !== seq) return;
      tableData.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '题单列表加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    void fetchTrainingSheets();
  };

  const handleSearch = () => {
    page.value = 1;
    void fetchTrainingSheets();
  };

  // 切换类型 (官方/用户)
  const toggleType = (type: TrainingTypeFilter) => {
    searchParams.value.type = type;
    handleSearch();
  };

  return {
    tableData,
    loading,
    error,
    total,
    page,
    pageSize,
    searchParams,
    fetchTrainingSheets,
    handlePageChange,
    handleSearch,
    toggleType,
  };
}
