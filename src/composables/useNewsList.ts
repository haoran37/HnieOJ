import { ref } from 'vue';

export interface NewsItem {
  id: string;
  title: string;
  author: string;
  createTime: string;
  isTop: boolean; // 是否置顶
  viewCount: number;
}

export function useNewsList() {
  const loading = ref(false);
  const newsList = ref<NewsItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(15);

  //TODO: 替换真实api
  const fetchNews = async () => {
    loading.value = true;
    
    setTimeout(() => {
      newsList.value = Array.from({ length: 15 }, (_, i) => {
        const isTop = page.value === 1 && i < 2;
        return {
          id: String(1000 + i),
          title: isTop 
            ? `【重要通知】HNIE Online Judge 系统维护公告 ${i+1}` 
            : `关于举办第 ${10 + i} 届程序设计竞赛的通知`,
          author: 'Admin',
          createTime: '2025-02-15',
          isTop: isTop,
          viewCount: Math.floor(Math.random() * 1000)
        };
      });
      total.value = 45;
      loading.value = false;
    }, 300);
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    fetchNews();
  };

  return {
    loading,
    newsList,
    total,
    page,
    pageSize,
    fetchNews,
    handlePageChange
  };
}