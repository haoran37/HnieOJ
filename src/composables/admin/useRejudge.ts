import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { get, post } from '@/utils/api';
import { submissionStatusText } from '@/types/submission';
import type { PageVo } from '@/types/problem';

// 后端 RejudgeTaskVo / RejudgeTaskDetailVo 的前端视图模型
export interface RejudgeTask {
  id: number;
  problemId: string;    // problemCode（展示编号）
  problemTitle: string; // 后端未返回标题，用编号占位
  contestId: number | null;
  submitter: string;    // adminId
  submitTime: string;
  totalCount: number;
  processedCount: number;
  failedCount: number;
  range: string;
  status: 'pending' | 'processing' | 'finished' | 'failed';
  result: string;
  // 后端未返回“变化数”，不能用 processedCount 冒充；null 表示暂无该统计
  changeCount: number | null;
}

export interface RejudgeDetail {
  runId: string;
  uid: string;
  username: string;
  originalStatus: string;
  currentStatus: string;
  language: string;
}

interface RejudgeTaskVo {
  id: number;
  problemCode: string | null;
  contestId: number | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  status: string;
  totalCount: number | null;
  processedCount: number | null;
  failedCount: number | null;
  lastError: string | null;
  adminId: string | null;
  gmtCreate: string | null;
}

interface RejudgeTaskDetailVo {
  runId: string | null;
  submissionId: string | null;
  uid: string | null;
  username: string | null;
  originalStatus: string | null;
  currentStatus: string | null;
  originalStatusCode: number | null;
  currentStatusCode: number | null;
  language: string | null;
}

function statusLabel(status: string | null): RejudgeTask['status'] {
  if (status === 'finished') return 'finished';
  if (status === 'failed') return 'failed';
  if (status === 'processing') return 'processing';
  return 'pending';
}

// 后端 RejudgeTaskRequest.rangeStart/rangeEnd 为 LocalDateTime（无时区），
// 必须保留用户选择的本地墙上时间，不能用 toISOString() 转成 UTC 剪切时区。
export function toLocalDateTime(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function toRejudgeTask(vo: RejudgeTaskVo): RejudgeTask {
  const status = statusLabel(vo.status);
  const failed = vo.failedCount ?? 0;
  const range =
    vo.rangeStart || vo.rangeEnd
      ? `${vo.rangeStart ? formatFullTime(vo.rangeStart) : '不限'} ~ ${vo.rangeEnd ? formatFullTime(vo.rangeEnd) : '不限'}`
      : '全部时间';
  let result = '重判中...';
  if (status === 'finished') result = failed > 0 ? `完成（失败 ${failed}）` : '完成';
  if (status === 'failed') result = vo.lastError || '任务失败';
  if (status === 'pending') result = '等待中';
  return {
    id: vo.id,
    problemId: vo.problemCode ?? '',
    problemTitle: vo.problemCode ?? '',
    contestId: vo.contestId ?? null,
    submitter: vo.adminId ?? '',
    submitTime: formatFullTime(vo.gmtCreate),
    totalCount: vo.totalCount ?? 0,
    processedCount: vo.processedCount ?? 0,
    failedCount: failed,
    range,
    status,
    result,
    // 后端未直接提供变化数，置空表示“暂无统计”，不伪造为 processedCount
    changeCount: null,
  };
}

export function useRejudge() {
  const message = useMessage();

  const loading = ref(false);
  const error = ref<string | null>(null);
  const rejudgeList = ref<RejudgeTask[]>([]);
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
      void fetchRejudgeList();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      void fetchRejudgeList();
    }
  });

  // 添加重判模态框
  const showAddModal = ref(false);
  const addForm = reactive({
    problemCode: '',
    startTime: null as number | null,
    endTime: null as number | null,
    rangeType: 'all' // 'all' | 'custom'
  });

  // 详情模态框
  const showDetailModal = ref(false);
  const detailLoading = ref(false);
  const currentDetailList = ref<RejudgeDetail[]>([]);
  const currentTask = ref<RejudgeTask | null>(null);

  // 请求序号：迟到的旧响应不得覆盖新分页的结果
  let listSeq = 0;
  let detailSeq = 0;

  const fetchRejudgeList = async () => {
    const current = ++listSeq;
    loading.value = true;
    error.value = null;
    try {
      const result = await get<PageVo<RejudgeTaskVo>>('/api/admin/submissions/rejudge-tasks', {
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      if (current !== listSeq) return;
      rejudgeList.value = (result?.list ?? []).map(toRejudgeTask);
      pagination.itemCount = result?.total ?? 0;
    } catch (err) {
      if (current !== listSeq) return;
      rejudgeList.value = [];
      pagination.itemCount = 0;
      error.value = err instanceof Error ? err.message : '重判任务加载失败';
    } finally {
      if (current === listSeq) loading.value = false;
    }
  };

  const handleAddRejudge = async () => {
    if (!addForm.problemCode.trim()) {
      message.warning('请输入题目编号（problemCode）');
      return;
    }
    if (addForm.rangeType === 'custom' && (!addForm.startTime || !addForm.endTime)) {
      message.warning('请选择时间范围');
      return;
    }

    loading.value = true;
    try {
      await post('/api/admin/submissions/rejudge-tasks', {
        problemCode: addForm.problemCode.trim(),
        rangeStart: addForm.rangeType === 'custom' && addForm.startTime ? toLocalDateTime(addForm.startTime) : undefined,
        rangeEnd: addForm.rangeType === 'custom' && addForm.endTime ? toLocalDateTime(addForm.endTime) : undefined,
      });
      message.success('重判任务已创建');
      showAddModal.value = false;
      addForm.problemCode = '';
      addForm.rangeType = 'all';
      addForm.startTime = null;
      addForm.endTime = null;
      await fetchRejudgeList();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建重判任务失败');
    } finally {
      loading.value = false;
    }
  };

  const handleShowDetails = async (task: RejudgeTask) => {
    currentTask.value = task;
    showDetailModal.value = true;
    await fetchRejudgeDetails(task.id);
  };

  const fetchRejudgeDetails = async (taskId: number) => {
    const current = ++detailSeq;
    detailLoading.value = true;
    try {
      const list = await get<RejudgeTaskDetailVo[]>(`/api/admin/rejudge/${taskId}/details`);
      if (current !== detailSeq) return;
      currentDetailList.value = (list ?? []).map((item) => ({
        runId: item.runId || item.submissionId || '',
        uid: item.uid ?? '',
        username: item.username ?? '',
        originalStatus: submissionStatusText(item.originalStatusCode, item.originalStatus),
        currentStatus: submissionStatusText(item.currentStatusCode, item.currentStatus),
        language: item.language ?? '',
      }));
    } catch (err) {
      if (current !== detailSeq) return;
      currentDetailList.value = [];
      message.error(err instanceof Error ? err.message : '重判详情加载失败');
    } finally {
      if (current === detailSeq) detailLoading.value = false;
    }
  };

  return {
    loading,
    error,
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
