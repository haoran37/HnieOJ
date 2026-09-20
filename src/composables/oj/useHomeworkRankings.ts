import { ref } from 'vue';

// 后端未提供作业成绩单/排名接口，明确标记为暂未开放，不用随机数据冒充。
export const HOMEWORK_RANKINGS_UNAVAILABLE = '成绩单暂未开放：后端暂未提供作业排名接口';

export function useHomeworkRankings() {
  const loading = ref(false);
  const available = ref(false);
  const unavailableReason = ref(HOMEWORK_RANKINGS_UNAVAILABLE);

  const fetchRankings = async (_hid: string) => {
    loading.value = false;
    available.value = false;
  };

  return { loading, available, unavailableReason, fetchRankings };
}
