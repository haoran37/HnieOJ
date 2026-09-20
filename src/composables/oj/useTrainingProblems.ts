import { ref } from 'vue';
import { checkProblem, getTrainingProblems } from '@/utils/api';

export interface TrainingProblemRow {
  id: number; // 内部 problemId
  displayId: number; // 后端 displayId（Integer>=1）
  problemCode: string; // 经 checkProblem 解析的展示编号
  title: string;
}

export function useTrainingProblems() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const tableData = ref<TrainingProblemRow[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  let seq = 0;

  const fetchProblemsInTraining = async (trainingId: string) => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await getTrainingProblems(trainingId, page.value, pageSize.value);
      if (current !== seq) return;
      const list = result?.list ?? [];
      const rows = await Promise.all(
        list.map(async (item) => {
          const check = await checkProblem(item.problemId);
          return {
            id: item.problemId,
            displayId: item.displayId ?? 0,
            problemCode: check?.problemCode ?? '',
            title: check?.title ?? '',
          };
        }),
      );
      if (current !== seq) return;
      tableData.value = rows;
      total.value = result?.total ?? 0;
    } catch (err) {
      if (current !== seq) return;
      tableData.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '题单题目加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  const handlePageChange = (p: number, trainingId: string) => {
    page.value = p;
    void fetchProblemsInTraining(trainingId);
  };

  return {
    loading,
    error,
    tableData,
    total,
    page,
    pageSize,
    fetchProblemsInTraining,
    handlePageChange,
  };
}
