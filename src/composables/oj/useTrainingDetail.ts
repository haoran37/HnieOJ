import { ref } from 'vue';

export interface TrainingDetail {
  id: string;
  title: string;
  description: string; // Markdown
  problemCount: number;
  favoriteCount: number;
  creator: string;
  type: 'OFFICIAL' | 'USER'; // 官方 or 用户
  rating: number; // 评分
  userProgress: number; // 用户完成度（0~100）
  isFavorite: boolean; // 是否已收藏
}

export function useTrainingDetail() {
  const loading = ref(false);
  const detail = ref<TrainingDetail>({
    id: '',
    title: '',
    description: '',
    problemCount: 0,
    favoriteCount: 0,
    creator: '',
    type: 'USER',
    rating: 0,
    userProgress: 0,
    isFavorite: false
  });

  //TODO: 替换真实api
  const fetchTrainingDetail = async (trainingId: string) => {
    loading.value = true;
    console.log(`API: GET /api/trainings/${trainingId}/information`);

    // 模拟 API 延迟
    setTimeout(() => {
      detail.value = {
        id: trainingId,
        title: trainingId === '1001' ? '动态规划入门精选' : '图论算法进阶',
        description: `
## 题单介绍
这是一个专门为 **动态规划 (DP)** 初学者准备的题单。

### 包含内容
- 线性 DP
- 背包问题
- 区间 DP

### 练习建议
建议按顺序刷题，每道题都尽量独立思考 30 分钟以上。
        `,
        problemCount: 25,
        favoriteCount: 1024,
        creator: 'HNIEOJ',
        type: 'OFFICIAL',
        rating: 4.5,
        userProgress: 68.5,
        isFavorite: false
      };
      loading.value = false;
    }, 400);
  };

  return {
    loading,
    detail,
    fetchTrainingDetail
  };
}