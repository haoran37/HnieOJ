import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { formatFullTime } from '@/composables/useTime';
import { getSubmissions } from '@/utils/api';
import { submissionStatusText } from '@/types/submission';

// 提交记录视图模型（字段由后端 SubmissionListItemVo 映射而来）
export interface Submission {
  id: string;          // submissionId
  studentId: string;   // uid
  username: string;
  problemId: string;   // 展示编号 problemCode
  problemTitle: string;
  status: string;      // statusText（后端已给中文/英文文案）
  language: string;
  time: string;        // 毫秒，形如 15 MS
  memory: string;      // KB
  submitTime: string;
  contestId?: string;
}

export interface StatusFilters {
  problem: string;
  user: string;
  language: string | null;
  status: number | null;
}

const queryValue = (value: string | null | (string | null)[] | undefined): string =>
  (typeof value === 'string' ? value : Array.isArray(value) ? value.find(item => typeof item === 'string') : undefined) || '';

export function useStatusList() {
  const route = useRoute();

  const loading = ref(false);
  const error = ref<string | null>(null);
  const listData = ref<Submission[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  // 筛选表单
  const filters = ref<StatusFilters>({
    problem: queryValue(route.query.pid),
    user: queryValue(route.query.uid),
    language: null,
    status: null,
  });

  // 获取 URL 中的比赛 ID（前端使用 cid 查询参数）
  const contestId = ref(queryValue(route.query.cid));

  // 局部请求序号：分页/筛选/路由 query 连续变化时，旧响应不得覆盖新查询
  let seq = 0;

  const fetchStatus = async () => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await getSubmissions({
        page: page.value,
        pageSize: pageSize.value,
        problemCode: filters.value.problem.trim() || undefined,
        language: filters.value.language || undefined,
        status: filters.value.status ?? undefined,
        uid: filters.value.user.trim() || undefined,
        contestId: contestId.value || undefined,
      });
      if (current !== seq) return;
      listData.value = (result?.list ?? []).map((item) => ({
        id: item.submissionId,
        studentId: item.uid ?? '',
        username: item.username ?? '',
        problemId: item.problemCode,
        // 列表 VO 不含题目标题，用编号占位并保持可跳转
        problemTitle: item.problemCode,
        status: submissionStatusText(item.status, item.statusText),
        language: item.language,
        time: item.time !== null && item.time !== undefined ? `${item.time} MS` : '--',
        memory: item.memory !== null && item.memory !== undefined ? `${item.memory} KB` : '--',
        submitTime: formatFullTime(item.gmtCreate),
        contestId: item.contestId ? String(item.contestId) : undefined,
      }));
      total.value = result?.total ?? 0;
    } catch (err) {
      if (current !== seq) return;
      listData.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '提交记录加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    void fetchStatus();
  };

  const handleSearch = () => {
    page.value = 1;
    void fetchStatus();
  };

  const handleRefresh = () => {
    void fetchStatus();
  };

  // 监听路由参数变化 (从比赛切回普通列表；题目详情带 pid 进入时按题号过滤)
  watch(() => route.query.cid, (newCid) => {
    contestId.value = queryValue(newCid);
    page.value = 1;
    handleRefresh();
  });

  watch(() => route.query.pid, (newPid) => {
    filters.value.problem = queryValue(newPid);
    page.value = 1;
    handleRefresh();
  });

  watch(() => route.query.uid, (newUid) => {
    filters.value.user = queryValue(newUid);
    page.value = 1;
    handleRefresh();
  });

  return {
    loading,
    error,
    listData,
    total,
    page,
    pageSize,
    filters,
    fetchStatus,
    handlePageChange,
    handleSearch,
    handleRefresh
  };
}
