import { ref, computed } from 'vue';
import { useStatusTime, useTimer } from '@/composables/useTime';
import { getContestDetail, type ContestProblemVo } from '@/utils/api';

export interface ContestDetail {
  id: string;
  title: string;
  beginTime: string;
  endTime: string;
  type: string;
  creator: string;
  description: string;
  status: string;
  isPublic: boolean;
  openRank: boolean;
  problemCount: number;
  problems: ContestProblemVo[];
}

function emptyDetail(): ContestDetail {
  return {
    id: '',
    title: '',
    beginTime: '',
    endTime: '',
    type: '',
    creator: '',
    description: '',
    status: '',
    isPublic: true,
    openRank: false,
    problemCount: 0,
    problems: [],
  };
}

export function useContestDetail() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const detail = ref<ContestDetail>(emptyDetail());

  const { now } = useTimer();

  const { contestStatus, timeText } = useStatusTime(
    () => detail.value.beginTime,
    () => detail.value.endTime,
  );

  const progressPercentage = computed(() => {
    if (!detail.value.beginTime || !detail.value.endTime) return 0;

    const current = now.value.getTime();
    const start = new Date(detail.value.beginTime).getTime();
    const end = new Date(detail.value.endTime).getTime();
    const total = end - start;

    if (total <= 0) return 100; // 避免除以0
    const elapsed = current - start;

    if (elapsed < 0) return 0;
    if (elapsed > total) return 100;
    return (elapsed / total) * 100;
  });

  // 局部请求序号：异步路由切换时旧响应不得覆盖新比赛
  let seq = 0;
  const fetchContestDetail = async (cid: string) => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const vo = await getContestDetail(cid);
      if (current !== seq) return;
      detail.value = {
        id: String(vo.id),
        title: vo.title,
        beginTime: vo.startTime ?? '',
        endTime: vo.endTime ?? '',
        type: vo.type ?? '',
        creator: vo.author ?? '',
        description: vo.description ?? '',
        status: vo.status ?? '',
        isPublic: (vo.auth ?? 'Public') !== 'Private',
        openRank: vo.openRank ?? false,
        problemCount: vo.problemCount ?? 0,
        problems: vo.problems ?? [],
      };
    } catch (err) {
      if (current !== seq) return;
      detail.value = emptyDetail();
      error.value = err instanceof Error ? err.message : '比赛详情加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return {
    loading,
    error,
    detail,
    contestStatus,
    timeText,
    progressPercentage,
    fetchContestDetail,
  };
}
