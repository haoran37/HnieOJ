import { ref } from 'vue';
import { getHomeworks } from '@/utils/api';

export interface HomeworkItem {
  id: string;
  title: string;
  source: string;
  author: string;
  beginTime: string;
  endTime: string;
  problemCount: number;
  classCount: number;
  status: number | null;
}

export function useHomeworkList() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const listData = ref<HomeworkItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(10);

  let seq = 0;

  const fetchHomeworks = async (params: { keyword?: string } = {}) => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await getHomeworks(page.value, pageSize.value, params.keyword);
      if (current !== seq) return;
      listData.value = (result?.list ?? []).map((vo) => ({
        id: String(vo.id),
        title: vo.title,
        source: vo.source ?? '',
        author: vo.author ?? '',
        beginTime: vo.startTime ?? '',
        endTime: vo.endTime ?? '',
        problemCount: vo.problemCount ?? 0,
        classCount: vo.classCount ?? 0,
        status: vo.status ?? null,
      }));
      total.value = result?.total ?? 0;
    } catch (err) {
      if (current !== seq) return;
      listData.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '作业列表加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return {
    loading,
    error,
    listData,
    total,
    page,
    pageSize,
    fetchHomeworks,
  };
}
