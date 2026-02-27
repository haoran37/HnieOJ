import { ref } from 'vue';

// 题目状态结构
export interface ProblemResult {
  status: 'AC' | 'WA' | 'PENDING' | 'NONE';
  score: number;       // IOI 分数 (0-100)
  penalty: number;     // ACM 罚时
  tryCount: number;    // 尝试次数
}

export interface StudentRank {
  id: string;
  name: string;
  studentId: string;
  // 统计
  totalScore: number; // IOI 总分
  solved: number;     // ACM 解题数
  penalty: number;    // ACM 总罚时
  problems: Record<string, ProblemResult>;
}

export function useHomeworkRankings() {
  const loading = ref(false);
  const rawRankData = ref<StudentRank[]>([]);

  //TODO: 替换真实api
  const fetchRankings = async (_hid: string) => {
    loading.value = true;
    setTimeout(() => {
      const mockData = Array.from({ length: 45 }, (_, i) => {
        const problems: Record<string, ProblemResult> = {};
        let totalScore = 0;
        let solved = 0;
        let totalPenalty = 0;

        for (let p = 0; p < 5; p++) {
          const rand = Math.random();
          let score = 0;
          let status: any = 'NONE';
          
          if (rand > 0.3) {
            if (rand > 0.5) {
              score = 100;
              status = 'AC';
              solved++;
              totalPenalty += Math.floor(Math.random() * 60);
            } else {
              score = Math.floor(Math.random() * 90);
              status = score > 0 ? 'WA' : 'WA';
              totalPenalty += 20;
            }
          }
          totalScore += score;
          problems[p] = { 
            status, 
            score, 
            penalty: 0, 
            tryCount: Math.floor(Math.random() * 5) + 1 
          };
        }

        return {
          id: String(i),
          name: `学生${100+i}`,
          studentId: `20230${100+i}`,
          totalScore,
          solved,
          penalty: totalPenalty,
          problems
        };
      });

      // 默认按总分排序
      rawRankData.value = mockData.sort((a, b) => b.totalScore - a.totalScore);
      loading.value = false;
    }, 500);
  };

  return { loading, rawRankData, fetchRankings };
}
