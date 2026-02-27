import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';

// 重判任务接口
export interface RejudgeTask {
  id: number;
  problemId: string;
  problemTitle: string;
  submitter: string; // 提交重判任务的管理员
  submitTime: string;
  totalCount: number; // 需要重判的总数
  processedCount: number; // 已处理数量
  range: string; // 时间范围
  status: 'pending' | 'processing' | 'finished' | 'error';
  result: string; // 简要结果描述，如 "未变化" 或 "变化: x"
  changeCount: number; // 变化数量
}

// 重判详情接口
export interface RejudgeDetail {
  runId: string;
  uid: string;
  username: string;
  originalStatus: string;
  currentStatus: string;
  language: string;
}

export function useRejudge() {
  const message = useMessage();

  // 列表相关
  const loading = ref(false);
  const rejudgeList = ref<RejudgeTask[]>([]);
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
      fetchRejudgeList();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      fetchRejudgeList();
    }
  });

  // 添加重判模态框相关
  const showAddModal = ref(false);
  const addForm = reactive({
    problemId: '',
    startTime: null as number | null,
    endTime: null as number | null,
    rangeType: 'all' // 'all' | 'custom'
  });

  // 详情模态框相关
  const showDetailModal = ref(false);
  const detailLoading = ref(false);
  const currentDetailList = ref<RejudgeDetail[]>([]);
  const currentTask = ref<RejudgeTask | null>(null);

  // 获取重判列表
  const fetchRejudgeList = () => {
    loading.value = true;
    console.log('API Request: GET /api/admin/rejudge/list', {
      page: pagination.page,
      size: pagination.pageSize
    });

    // Mock Data
    setTimeout(() => {
      const mockData: RejudgeTask[] = Array.from({ length: pagination.pageSize }, (_, i) => {
        const id = (pagination.page - 1) * pagination.pageSize + i + 1;
        const isFinished = i > 2;
        const total = Math.floor(Math.random() * 100) + 10;
        const processed = isFinished ? total : Math.floor(Math.random() * total);
        const changeCount = isFinished ? (Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 1 : 0) : 0;
        
        return {
          id,
          problemId: `100${id % 10}`,
          problemTitle: `Problem Title ${id}`,
          submitter: 'admin',
          submitTime: formatFullTime(new Date(Date.now() - id * 3600000)),
          totalCount: total,
          processedCount: processed,
          range: 'All Time',
          status: isFinished ? 'finished' : 'processing',
          result: isFinished ? (changeCount > 0 ? `变化: ${changeCount}` : '未变化') : '重判中...',
          changeCount
        };
      });

      rejudgeList.value = mockData;
      pagination.itemCount = 50;
      loading.value = false;
    }, 500);
  };

  // 提交添加重判
  const handleAddRejudge = () => {
    if (!addForm.problemId) {
      message.warning('请输入题目ID');
      return;
    }

    console.log('API Request: POST /api/admin/rejudge', {
      problemId: addForm.problemId,
      range: addForm.rangeType === 'all' ? 'all' : { start: addForm.startTime, end: addForm.endTime }
    });

    message.success('重判任务已添加');
    showAddModal.value = false;
    // 重置表单
    addForm.problemId = '';
    addForm.rangeType = 'all';
    addForm.startTime = null;
    addForm.endTime = null;
    
    fetchRejudgeList();
  };

  // 查看详情
  const handleShowDetails = (task: RejudgeTask) => {
    if (task.changeCount === 0) return;
    
    currentTask.value = task;
    showDetailModal.value = true;
    fetchRejudgeDetails(task.id);
  };

  // 获取详情数据
  const fetchRejudgeDetails = (taskId: number) => {
    detailLoading.value = true;
    console.log(`API Request: GET /api/admin/rejudge/${taskId}/details`);

    // Mock Data
    setTimeout(() => {
      const count = currentTask.value?.changeCount || 5;
      currentDetailList.value = Array.from({ length: count }, (_, i) => {
        const statusPool = ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error'];
        const original = statusPool[Math.floor(Math.random() * statusPool.length)] || 'Accepted';
        let current = statusPool[Math.floor(Math.random() * statusPool.length)] || 'Wrong Answer';
        while (current === original) {
          current = statusPool[Math.floor(Math.random() * statusPool.length)] || 'Wrong Answer';
        }

        return {
          runId: `${80000 + i}`,
          uid: `202300${i}`,
          username: `User_${i}`,
          originalStatus: original,
          currentStatus: current,
          language: ['C++', 'Java', 'Python'][i % 3] || 'C++'
        };
      });
      detailLoading.value = false;
    }, 400);
  };

  return {
    loading,
    rejudgeList,
    pagination,
    showAddModal,
    addForm,
    showDetailModal,
    detailLoading,
    currentDetailList,
    currentTask,
    fetchRejudgeList,
    handleAddRejudge,
    handleShowDetails
  };
}
