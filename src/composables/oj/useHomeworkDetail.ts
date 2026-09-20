import { ref } from 'vue';
import { getHomeworkDetail, type HomeworkProblemVo } from '@/utils/api';

export interface HomeworkDetail {
  id: string;
  title: string;
  source: string;
  author: string;
  description: string;
  beginTime: string;
  deadline: string;
  status: number | null;
  classIds: number[];
  problems: HomeworkProblemVo[];
  gmtCreate: string;
  gmtModified: string;
}

function emptyDetail(): HomeworkDetail {
  return {
    id: '',
    title: '',
    source: '',
    author: '',
    description: '',
    beginTime: '',
    deadline: '',
    status: null,
    classIds: [],
    problems: [],
    gmtCreate: '',
    gmtModified: '',
  };
}

export function useHomeworkDetail() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const detail = ref<HomeworkDetail>(emptyDetail());

  let seq = 0;
  const fetchHomeworkDetail = async (hid: string) => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const vo = await getHomeworkDetail(hid);
      if (current !== seq) return;
      detail.value = {
        id: String(vo.id),
        title: vo.title,
        source: vo.source ?? '',
        author: vo.author ?? '',
        description: vo.description ?? '',
        beginTime: vo.startTime ?? '',
        deadline: vo.endTime ?? '',
        status: vo.status ?? null,
        classIds: vo.classIds ?? [],
        problems: vo.problems ?? [],
        gmtCreate: vo.gmtCreate ?? '',
        gmtModified: vo.gmtModified ?? '',
      };
    } catch (err) {
      if (current !== seq) return;
      detail.value = emptyDetail();
      error.value = err instanceof Error ? err.message : '作业详情加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return { loading, error, detail, fetchHomeworkDetail };
}
