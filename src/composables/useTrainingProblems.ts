import { ref } from 'vue';

export function useTrainingProblems() {
  const loading = ref(false);
  const tableData = ref<any[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  //TODO: 替换真实api
  const fetchProblemsInTraining = async (trainingId: string) => {
    loading.value = true;
    console.log(`API: GET /api/trainings/${trainingId}/problems`, {
      page: page.value,
      size: pageSize.value
    });

    // 模拟 API
    setTimeout(() => {
      tableData.value = Array.from({ length: pageSize.value }, (_, i) => {
        const id = 1000 + (page.value - 1) * 20 + i;
        return {
          id: String(id),
          title: `DP 练习题 - ${id}`,
          difficulty: ['简单', '普及-', '普及/提高-', '困难'][i % 4],
          tags: ['DP', '背包'],
          passRate: Math.floor(Math.random() * 80 + 10),
          rate: (Math.random() * 5).toFixed(1)
        };
      });
      total.value = 50;
      loading.value = false;
    }, 500);
  };

  const handlePageChange = (p: number, trainingId: string) => {
    page.value = p;
    fetchProblemsInTraining(trainingId);
  };

  return {
    loading,
    tableData,
    total,
    page,
    pageSize,
    fetchProblemsInTraining,
    handlePageChange
  };
}