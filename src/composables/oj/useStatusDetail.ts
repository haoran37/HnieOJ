import { onUnmounted, ref } from 'vue';
import type { MessageApi } from 'naive-ui';
import {
  getSubmissionCases,
  getSubmissionDetail,
  rejudgeSubmission,
} from '@/utils/api';
import { isJudgingStatus, submissionStatusText } from '@/types/submission';
import type { SubmissionCaseVo } from '@/types/submission';
import { formatFullTime } from '@/composables/useTime';

export interface TestPoint {
  id: number; // 测试点序号（caseNo），用于测试数据下载
  caseId: string;
  status: string;
  score: number;
  time: string;
  memory: string;
}

export interface StatusDetail {
  id: string;
  problemId: string;
  problemTitle: string;
  author: string;
  authorId: string;
  language: string;
  status: string;
  statusCode: number | null;
  score: number;
  timeUsed: string;
  memoryUsed: string;
  submitTime: string;
  judgeTime: string;
  codeLength: string;
  code: string;
  compilerOutput?: string;
  testPoints: TestPoint[];
}

const POLL_INTERVAL = 1500;
const MAX_POLLS = 400;

function numericCaseNo(caseId: string, index: number): number {
  const parsed = Number.parseInt(caseId, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : index + 1;
}

function mapTestPoints(cases: SubmissionCaseVo[]): TestPoint[] {
  return cases.map((item, index) => ({
    id: numericCaseNo(item.caseId, index),
    caseId: item.caseId,
    status: submissionStatusText(item.status, item.statusText),
    score: item.score ?? 0,
    time: item.time !== null && item.time !== undefined ? `${item.time}ms` : '--',
    memory: item.memory !== null && item.memory !== undefined ? `${item.memory}KB` : '--',
  }));
}

export function useStatusDetail() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  // 轮询期间的瞬时失败：保留已加载的详情，同时暴露可重试错误，不静默卡在“评测中”
  const pollError = ref<string | null>(null);
  // 测试点单独失败：保留上一次成功结果并提示，不伪装成空数据
  const casesError = ref<string | null>(null);
  // 达到最大轮询次数仍未到终态：需要用户手动刷新
  const exhausted = ref(false);
  const detail = ref<StatusDetail | null>(null);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let activeRunId: string | null = null;
  let detailRunId: string | null = null;
  // 每次新的查询/路由切换都会自增，用于作废所有更早的在途请求
  let generation = 0;
  let disposed = false;
  let pollCount = 0;

  const stopPolling = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  // 递增代号并清理计时器：旧请求返回时 isCurrent 判定失败，不会再写状态或续轮询
  const invalidate = () => {
    generation += 1;
    stopPolling();
  };

  const isCurrent = (runId: string, gen: number) =>
    !disposed && gen === generation && activeRunId === runId;

  const schedulePoll = (runId: string, gen: number) => {
    stopPolling();
    if (!isCurrent(runId, gen)) return;
    if (pollCount >= MAX_POLLS) {
      exhausted.value = true;
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      if (!isCurrent(runId, gen)) return;
      pollCount += 1;
      void load(runId, gen, true);
    }, POLL_INTERVAL);
  };

  const load = async (runId: string, gen: number, silent: boolean) => {
    activeRunId = runId;
    if (!silent) {
      loading.value = true;
      error.value = null;
      pollError.value = null;
      casesError.value = null;
      exhausted.value = false;
    } else {
      pollError.value = null;
    }
    try {
      const data = await getSubmissionDetail(runId);
      if (!isCurrent(runId, gen)) return;

      let cases: SubmissionCaseVo[] | null = null;
      try {
        cases = await getSubmissionCases(runId);
      } catch (err) {
        if (!isCurrent(runId, gen)) return;
        casesError.value = err instanceof Error ? err.message : '测试点信息加载失败';
      }
      if (!isCurrent(runId, gen)) return;
      // 后续成功拉取必须清除之前的测试点错误，避免旧错误一直挂着
      if (cases) casesError.value = null;

      const code = data.code ?? '';
      const previous = detailRunId === runId ? detail.value?.testPoints : undefined;
      const testPoints = cases ? mapTestPoints(cases) : (previous ?? []);
      detailRunId = runId;
      detail.value = {
        id: data.submissionId,
        problemId: data.problemCode,
        // 提交详情 VO 未返回题目标题，用展示编号占位
        problemTitle: '',
        author: data.username ?? data.uid ?? '',
        authorId: data.uid ?? '',
        language: data.language,
        status: submissionStatusText(data.status, data.statusText),
        statusCode: data.status,
        score: data.score ?? 0,
        timeUsed: data.time !== null && data.time !== undefined ? `${data.time}ms` : '--',
        memoryUsed: data.memory !== null && data.memory !== undefined ? `${data.memory}KB` : '--',
        submitTime: formatFullTime(data.gmtCreate),
        judgeTime: isJudgingStatus(data.status) ? '评测中…' : formatFullTime(data.gmtModified),
        codeLength: code ? `${new Blob([code]).size} Bytes` : '--',
        code,
        compilerOutput: data.diagnosticMessage || data.errorMessage || '',
        testPoints,
      };

      if (isJudgingStatus(data.status)) {
        schedulePoll(runId, gen);
      } else {
        stopPolling();
      }
    } catch (err) {
      if (!isCurrent(runId, gen)) return;
      const message = err instanceof Error ? err.message : '提交详情加载失败';
      if (!silent) {
        detail.value = null;
        detailRunId = null;
        error.value = message;
      } else {
        // 轮询失败：保留最后一次详情，停止轮询并暴露错误/手动刷新入口
        pollError.value = message;
        stopPolling();
      }
    } finally {
      if (!silent && isCurrent(runId, gen)) loading.value = false;
    }
  };

  // 拉取提交详情并按需轮询，直到终态；同一 ID 重复调用会作废更早的在途请求
  const fetchStatusDetail = async (runId: string) => {
    invalidate();
    activeRunId = runId;
    pollCount = 0;
    await load(runId, generation, false);
  };

  // 手动刷新/重试：在轮询失败或达到上限后由 UI 调用
  const retry = async () => {
    if (!activeRunId) return;
    await fetchStatusDetail(activeRunId);
  };

  // 管理员/教师重判：真实 POST 后刷新
  const rejudge = async (runId: string, message: MessageApi) => {
    try {
      await rejudgeSubmission(runId);
      message.success('重测请求已提交');
      await fetchStatusDetail(runId);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '重测失败');
    }
  };

  // 组件卸载 / 路由切换时作废在途请求并停止计时器
  onUnmounted(() => {
    disposed = true;
    invalidate();
  });

  return {
    loading,
    error,
    detail,
    pollError,
    casesError,
    exhausted,
    fetchStatusDetail,
    retry,
    rejudge,
    stopPolling,
  };
}
