import { ref, computed } from 'vue';
import { useContestStatusTime, useContestTimer } from '@/composables/useContestTime';

export interface ContestDetail {
  id: string;
  title: string;
  beginTime: string;
  endTime: string;
  type: string;
  creator: string;
  description: string;
}

export function useContestDetail() {
  const loading = ref(false);
  const detail = ref<ContestDetail>({
    id: '',
    title: '',
    beginTime: '',
    endTime: '',
    type: 'ACM',
    creator: '',
    description: ''
  });

  const { now } = useContestTimer();

  const { contestStatus, timeText } = useContestStatusTime(
    () => detail.value.beginTime,
    () => detail.value.endTime
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

  //TODO: 替换真实api
  const fetchContestDetail = async (cid: string) => {
    loading.value = true;
    setTimeout(() => {
      const nowTime = new Date();
      const start = new Date(nowTime.getTime() + 3600);
      const end = new Date(nowTime.getTime() + 3600 * 5);

      detail.value = {
        id: cid,
        title: 'HNIE 2026 新年欢乐赛 (ACM Mode)',
        beginTime: start.toISOString(),
        endTime: end.toISOString(),
        type: 'ACM',
        creator: 'Admin',
        description: `
# 比赛规则

1.  本场比赛为 **ACM 赛制**。
2.  比赛期间请勿与他人交流代码。
3.  提交错误会有 **20分钟** 罚时。

## 奖励
- Rank 1: 1000￥
- Rank 2-3: 500￥
- Rank 4-10: 100￥
- Rank 11-20: 50￥
        `
      };
      loading.value = false;
    }, 300);
  };

  return {
    loading,
    detail,
    contestStatus,
    timeText,
    progressPercentage,
    fetchContestDetail
  };
}