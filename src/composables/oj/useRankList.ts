import { ref } from 'vue';

export interface RankUser {
  rank: number;
  uid: string;
  username: string;
  realname: string;
  college: string;
  grade: string;
  majorClass: string;
  solved: number;
  submitted: number;
}

// 后端暂无排名接口，明确标记暂未开放，不使用随机数据。
export const RANK_UNAVAILABLE = '排行榜暂未开放：后端暂未提供排名接口';

export function useRankList() {
  const loading = ref(false);
  const available = ref(false);
  const unavailableReason = ref(RANK_UNAVAILABLE);
  const listData = ref<RankUser[]>([]);
  const total = ref(0);

  const fetchRankList = async () => {
    loading.value = false;
    available.value = false;
    listData.value = [];
    total.value = 0;
  };

  return { loading, available, unavailableReason, listData, total, fetchRankList };
}
