import { ref, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { getDiscussions } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

export type DiscussCategory = 'All' | 'Site' | 'Problem';
export type DiscussSort = 'Latest' | 'Hot';

export interface DiscussItem {
  id: number;
  uid: string;
  title: string;
  username: string;
  date: string;
  problemId: string | null;
  category: 'Site' | 'Problem';
  replyCount: number;
  isTop: boolean;
  contentSnippet: string;
}

export function useDiscussList() {
  const route = useRoute();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const list = ref<DiscussItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(10);

  const initialCategory = route.query.category;
  const activeCategory = ref<DiscussCategory>(
    initialCategory === 'Site' || initialCategory === 'Problem' ? initialCategory : 'All',
  );
  const searchText = ref('');
  const sortBy = ref<DiscussSort>('Latest');

  let seq = 0;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  const fetchDiscussions = async () => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await getDiscussions(page.value, pageSize.value, {
        category: activeCategory.value === 'All' ? undefined : activeCategory.value,
        keyword: searchText.value,
        sort: sortBy.value,
      });
      if (current !== seq) return;
      list.value = (result?.list ?? []).map((vo) => ({
        id: vo.id,
        uid: vo.uid ?? '',
        title: vo.title,
        username: vo.author ?? '',
        date: formatFullTime(vo.gmtCreate),
        problemId: vo.problemCode,
        category: vo.category === 'Site' ? 'Site' : 'Problem',
        replyCount: vo.answerCount ?? 0,
        isTop: (vo.topPriority ?? 0) > 0,
        contentSnippet: vo.description ?? '',
      }));
      total.value = result?.total ?? 0;
    } catch (err) {
      if (current !== seq) return;
      list.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '讨论列表加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    void fetchDiscussions();
  };

  const handleSearch = () => {
    page.value = 1;
    void fetchDiscussions();
  };

  const handleSortChange = (value: string | number) => {
    sortBy.value = value as DiscussSort;
    page.value = 1;
    void fetchDiscussions();
  };

  const handleCategoryChange = (value: string | number) => {
    activeCategory.value = value as DiscussCategory;
    page.value = 1;
    void fetchDiscussions();
  };

  // 搜索防抖，并取消在途旧请求
  watch(searchText, () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTimer = null;
      handleSearch();
    }, 300);
  });

  onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
    seq += 1;
  });

  return {
    loading,
    error,
    list,
    total,
    page,
    pageSize,
    activeCategory,
    searchText,
    sortBy,
    fetchDiscussions,
    handlePageChange,
    handleSearch,
    handleSortChange,
    handleCategoryChange,
    // 服务端分页下当前页即展示列表
    displayList: list,
  };
}
