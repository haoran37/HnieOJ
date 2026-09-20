import { ref } from 'vue';
import { getTrainingInformation } from '@/utils/api';

export type TrainingType = 'OFFICIAL' | 'USER';

export interface TrainingDetail {
  id: string;
  title: string;
  description: string; // Markdown
  problemCount: number;
  creator: string;
  type: TrainingType;
  categories: string[];
  status: number | null;
  gmtCreate: string;
  gmtModified: string;
}

function emptyDetail(): TrainingDetail {
  return {
    id: '',
    title: '',
    description: '',
    problemCount: 0,
    creator: '',
    type: 'USER',
    categories: [],
    status: null,
    gmtCreate: '',
    gmtModified: '',
  };
}

export function useTrainingDetail() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const detail = ref<TrainingDetail>(emptyDetail());

  let seq = 0;
  const fetchTrainingDetail = async (trainingId: string) => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const vo = await getTrainingInformation(trainingId);
      if (current !== seq) return;
      detail.value = {
        id: String(vo.id),
        title: vo.title,
        description: vo.description ?? '',
        problemCount: vo.problemCount ?? 0,
        creator: vo.author ?? '',
        type: vo.type?.toLowerCase() === 'user' ? 'USER' : 'OFFICIAL',
        categories: vo.categories ?? [],
        status: vo.status ?? null,
        gmtCreate: vo.gmtCreate ?? '',
        gmtModified: vo.gmtModified ?? '',
      };
    } catch (err) {
      if (current !== seq) return;
      detail.value = emptyDetail();
      error.value = err instanceof Error ? err.message : '题单详情加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return {
    loading,
    error,
    detail,
    fetchTrainingDetail,
  };
}
