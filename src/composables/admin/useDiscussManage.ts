import { ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime'

export interface DiscussItem {
  id: number;
  title: string;
  uid: string;
  author: string;
  category: 'Site' | 'Problem';
  createTime: string;
  status: 'Normal' | 'Top' | 'Closed';
  content?: string;
  tags?: string[];
}

export function useDiscussManage() {
  const message = useMessage();

  const loading = ref(false);
  const discussList = ref<DiscussItem[]>([]);
  
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
      fetchDiscussList();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      fetchDiscussList();
    }
  });

  const searchForm = reactive({
    keyword: ''
  });

  // Mock API: 获取讨论列表
  const fetchDiscussList = async () => {
    loading.value = true;
    console.log('[Mock API] Fetching discuss list...', { 
      page: pagination.page, 
      size: pagination.pageSize, 
      keyword: searchForm.keyword 
    });
    
    // 模拟延迟
    setTimeout(() => {
      const mockData: DiscussItem[] = Array.from({ length: pagination.pageSize }).map((_, index) => {
        const id = (pagination.page - 1) * pagination.pageSize + index + 1;
        return {
          id: id,
          title: `讨论主题 ${id} - ${searchForm.keyword || '默认话题'}`,
          uid: `2022${String(id).padStart(4, '0')}`,
          author: `User_${id}`,
          category: Math.random() > 0.3 ? 'Problem' : 'Site',
          createTime: formatFullTime('2026-01-25 12:00:00'),
          status: Math.random() > 0.9 ? 'Closed' : (Math.random() > 0.8 ? 'Top' : 'Normal'),
          content: '这是一段测试用的 Markdown 内容...',
          tags: ['算法', 'C++']
        };
      });

      discussList.value = mockData;
      pagination.itemCount = 100; // 假装有100条
      loading.value = false;
    }, 500);
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchDiscussList();
  };

  // --- 编辑模态框相关逻辑 ---
  const showEditModal = ref(false);
  const editLoading = ref(false);
  
  const editForm = reactive({
    id: 0,
    title: '',
    status: 'Normal' as 'Normal' | 'Top' | 'Closed',
    category: 'Problem' as 'Site' | 'Problem',
    content: '',
    tags: [] as string[]
  });

  const openEditModal = (row: DiscussItem) => {
    editForm.id = row.id;
    editForm.title = row.title;
    editForm.status = row.status;
    editForm.category = row.category;
    editForm.content = row.content || ''; // 实际场景可能需要单独请求详情
    editForm.tags = row.tags || [];
    showEditModal.value = true;
  };

  const handleSaveEdit = () => {
    editLoading.value = true;
    console.log('[Mock API] Saving discuss changes:', editForm);
    
    setTimeout(() => {
      message.success('保存成功');
      editLoading.value = false;
      showEditModal.value = false;
      fetchDiscussList(); // 刷新列表
    }, 600);
  };

  // --- 删除逻辑 ---
  const handleDelete = (row: DiscussItem) => {
    console.log(`[Mock API] Deleting discuss id=${row.id}`);
    message.success('删除成功');
    fetchDiscussList();
  };

  onMounted(() => {
    fetchDiscussList();
  });

  return {
    loading,
    discussList,
    pagination,
    searchForm,
    handleSearch,
    fetchDiscussList,
    
    showEditModal,
    editLoading,
    editForm,
    openEditModal,
    handleSaveEdit,
    
    handleDelete
  };
}
