import { ref } from 'vue';

export interface ScoreboardProblem {
  status: 'AC' | 'WA' | 'PENDING' | 'NONE';
  time: number; // 分钟数
  tryCount: number; // 错误次数 (不含AC那次)
  isFirstAc: boolean; // 是否一血
}

export interface RankItem {
  rank: number;
  userId: string;
  username: string;
  name: string;
  solved: number;
  penalty: number; // 分钟
  problems: Record<string, ScoreboardProblem>; // key是题目索引 0, 1, 2...
}

export function useContestScoreboard() {
  const loading = ref(false);
  const rankData = ref<RankItem[]>([]);

  //TODO: 替换真实api
  const fetchScoreboard = async (_cid: string) => {
    loading.value = true;
    setTimeout(() => {
      const mockProblems = (acRate: number): Record<string, ScoreboardProblem> => {
        const p: Record<string, ScoreboardProblem> = {};
        for(let i=0; i<5; i++) {
          const rand = Math.random();
          if (rand < acRate) {
            p[i] = { status: 'AC', time: Math.floor(Math.random() * 300), tryCount: Math.floor(Math.random() * 3), isFirstAc: Math.random() > 0.95 };
          } else if (rand < acRate + 0.2) {
            p[i] = { status: 'WA', time: 0, tryCount: Math.floor(Math.random() * 5) + 1, isFirstAc: false };
          }
        }
        return p;
      };

      const list: RankItem[] = Array.from({ length: 100 }, (_, i) => ({
        rank: i + 1,
        userId: i === 11 ? '202202050231' : `user_${1000+i}`,
        username: i === 11 ? 'MyUserAccount' : `coder_${i}`,
        name: i === 11 ? '我' : `选手${i}`,
        solved: Math.max(0, Math.floor(5 - i * 0.05)), 
        penalty: Math.floor(Math.random() * 1000),
        problems: mockProblems(0.5 - i * 0.005)
      }));

      rankData.value = list;
      loading.value = false;
    }, 500);
  };

  return {
    loading,
    rankData,
    fetchScoreboard
  };
}
