import { ref } from 'vue';
import { getAnnouncementDetail } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

// 公告/新闻详情：字段对应后端 AnnouncementDetailVo
export interface NewsDetail {
  id: string;
  title: string;
  author: string; // 后端只返回 uid
  createTime: string;
  content: string;
}

export function useNewsDetail() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const detail = ref<NewsDetail>({
    id: '',
    title: '',
    author: '',
    createTime: '',
    content: '',
  });

  let seq = 0;
  const fetchNewsDetail = async (id: string) => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const vo = await getAnnouncementDetail(id);
      if (current !== seq) return;
      detail.value = {
        id: String(vo.id),
        title: vo.title,
        author: vo.uid ?? '',
        createTime: formatFullTime(vo.gmtCreate),
        content: vo.content ?? '',
      };
    } catch (err) {
      if (current !== seq) return;
      detail.value = { id: '', title: '', author: '', createTime: '', content: '' };
      error.value = err instanceof Error ? err.message : '公告详情加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return {
    loading,
    error,
    detail,
    fetchNewsDetail,
  };
}
