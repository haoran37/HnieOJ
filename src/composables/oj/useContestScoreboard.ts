import { ref } from 'vue';

// 后端当前没有比赛排行榜/名次接口（backend-routes.json 未收录），
// 这里明确标记为暂未开放，绝不用随机数据冒充。
export const SCOREBOARD_UNAVAILABLE = '排行榜暂未开放：后端暂未提供比赛排行榜接口';

export function useContestScoreboard() {
  const loading = ref(false);
  const available = ref(false);
  const unavailableReason = ref(SCOREBOARD_UNAVAILABLE);

  const fetchScoreboard = async (_cid: string) => {
    loading.value = false;
    available.value = false;
  };

  return {
    loading,
    available,
    unavailableReason,
    fetchScoreboard,
  };
}
