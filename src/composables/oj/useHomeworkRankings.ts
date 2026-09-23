import { ref } from 'vue';
import { getHomeworkRankings, type HomeworkRankVo } from '@/utils/api';

export function useHomeworkRankings() {
  const loading = ref(false);
  const rows = ref<HomeworkRankVo[]>([]);
  const error = ref('');

  const fetchRankings = async (hid: string) => {
    loading.value = true;
    error.value = '';
    try {
      rows.value = await getHomeworkRankings(hid);
    } catch (cause) {
      rows.value = [];
      error.value = cause instanceof Error ? cause.message : '获取成绩单失败';
    } finally {
      loading.value = false;
    }
  };

  return { loading, rows, error, fetchRankings };
}
