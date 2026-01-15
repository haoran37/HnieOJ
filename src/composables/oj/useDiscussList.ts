import { ref, computed } from 'vue';

export interface DiscussItem {
  id: number;
  title: string;
  username: string;
  avatar?: string;
  date: string;
  problemId: string | null;
  category: 'Site' | 'Problem';
  replyCount: number;
  isTop: boolean;
  contentSnippet: string; // 简略内容，用于搜索
}

export function useDiscussList() {
  const loading = ref(false);
  const allDiscussions = ref<DiscussItem[]>([]); // 存储所有数据
  const page = ref(1);
  const pageSize = ref(10);
  
  const activeCategory = ref<'All' | 'Site' | 'Problem'>('All');
  const searchText = ref('');
  const sortBy = ref<'Latest' | 'Hot'>('Latest');

  //TODO: 替换真实api
  const fetchDiscussions = async () => {
    loading.value = true;
    
    setTimeout(() => {
      allDiscussions.value = Array.from({ length: 45 }, (_, i) => {
        const isSite = i % 5 === 0;
        const isTop = i === 0 || i === 1;
        
        return {
          id: 1000 + i,
          title: isSite 
            ? `【公告】关于第 ${i} 次系统维护的通知` 
            : `关于题目 P${1000 + i} 的时间复杂度疑问`,
          username: `User_${i}`,
          date: '2025-02-14',
          problemId: isSite ? null : `P${1000 + i}`,
          category: isSite ? 'Site' : 'Problem',
          replyCount: Math.floor(Math.random() * 50),
          isTop: isTop,
          contentSnippet: '这里是帖子内容的简略预览...'
        };
      });
      
      loading.value = false;
    }, 400);
  };

  // 前端过滤与排序
  const filteredList = computed(() => {
    let result = [...allDiscussions.value];

    // 分类筛选
    if (activeCategory.value !== 'All') {
      result = result.filter(item => item.category === activeCategory.value);
    }

    // 文本搜索
    if (searchText.value) {
      const lowerText = searchText.value.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(lowerText) || 
        item.problemId?.toLowerCase().includes(lowerText) ||
        item.username.toLowerCase().includes(lowerText)
      );
    }

    // 排序
    result.sort((a, b) => {
      if (a.isTop !== b.isTop) return a.isTop ? -1 : 1;
      
      if (sortBy.value === 'Hot') {
        return b.replyCount - a.replyCount;
      }
      return b.id - a.id; // ID 越大越新
    });

    return result;
  });

  // 分页后的数据
  const displayList = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filteredList.value.slice(start, start + pageSize.value);
  });

  const total = computed(() => filteredList.value.length);

  const handlePageChange = (p: number) => {
    page.value = p;
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    loading,
    displayList,
    total,
    page,
    pageSize,
    activeCategory,
    searchText,
    sortBy,
    fetchDiscussions,
    handlePageChange
  };
}