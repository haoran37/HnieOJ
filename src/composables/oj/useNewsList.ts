import { ref } from 'vue';
import { getAnnouncements, type AnnouncementCategory } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

// 公告/新闻列表：字段对应后端 AnnouncementListVo
export interface NewsItem {
  id: string;
  title: string;
  author: string; // 后端只返回 uid
  createTime: string;
}

/**
 * 前台公告/新闻列表。
 *
 * - 不传 category 时保持旧的“全部公告”行为（首页公告卡片）；
 * - 新闻页传 'NEWS'，只展示新闻；
 * - 搜索后翻页保留关键词；加载失败保留 error 供页面重试，不伪装成空列表。
 */
export function useNewsList(category?: AnnouncementCategory) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const newsList = ref<NewsItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(15);
  const keyword = ref('');

  let seq = 0;

  const fetchNews = async (searchKeyword?: string) => {
    if (searchKeyword !== undefined) keyword.value = searchKeyword;
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await getAnnouncements(page.value, pageSize.value, keyword.value, category);
      if (current !== seq) return;
      newsList.value = (result?.list ?? []).map((vo) => ({
        id: String(vo.id),
        title: vo.title,
        author: vo.uid ?? '',
        createTime: formatFullTime(vo.gmtCreate),
      }));
      total.value = result?.total ?? 0;
    } catch (err) {
      if (current !== seq) return;
      newsList.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '列表加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  const handleSearch = () => {
    page.value = 1;
    void fetchNews(keyword.value);
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    void fetchNews(keyword.value);
  };

  return {
    loading,
    error,
    newsList,
    total,
    page,
    pageSize,
    keyword,
    fetchNews,
    handleSearch,
    handlePageChange,
  };
}
