import { ref } from 'vue';
import { getContestScoreboard, type ContestRankVo } from '@/utils/api';

export function useContestScoreboard() {
  const loading = ref(false);
  const rows = ref<ContestRankVo[]>([]);
  const error = ref('');
  let seq = 0;

  const fetchScoreboard = async (cid: string) => {
    const current = ++seq;
    loading.value = true;
    error.value = '';
    try {
      const result = await getContestScoreboard(cid);
      if (current === seq) rows.value = result;
    } catch (cause) {
      if (current === seq) {
        rows.value = [];
        error.value = cause instanceof Error ? cause.message : '获取排行榜失败';
      }
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return {
    loading,
    rows,
    error,
    fetchScoreboard,
  };
}
