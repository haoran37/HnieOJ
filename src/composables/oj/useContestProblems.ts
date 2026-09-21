import { ref } from 'vue';
import { checkProblem, type ContestProblemVo } from '@/utils/api';
import { buildDisplayIdByIndex } from '@/utils/displayId';

export interface ContestProblemRow {
  id: number; // 内部 problemId，用于下载测试点等内部接口
  problemCode: string; // 展示编号，用于 /problem/<code> 与提交
  displayId: string; // 比赛内题目序号（A/B/C...）
  title: string;
  color: string;
}

// problemId -> problemCode 在同一会话内可复用
const problemCodeCache = new Map<number, string>();

export function useContestProblems() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const problems = ref<ContestProblemRow[]>([]);

  let seq = 0;

  // 比赛详情只给内部 problemId，必须经 checkProblem 换成展示编号
  const fetchContestProblems = async (contestProblems: ContestProblemVo[]) => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const rows = await Promise.all(
        contestProblems.map(async (p, index) => {
          let problemCode = problemCodeCache.get(p.problemId) ?? '';
          let title = p.displayTitle ?? '';
          if (!problemCode) {
            const check = await checkProblem(p.problemId);
            problemCode = check?.problemCode ?? '';
            if (!title) title = check?.title ?? '';
            if (problemCode) problemCodeCache.set(p.problemId, problemCode);
          }
          return {
            id: p.problemId,
            problemCode,
            displayId: p.displayId ?? buildDisplayIdByIndex(index),
            title,
            color: p.color ?? '',
          };
        }),
      );
      if (current !== seq) return;
      problems.value = rows;
    } catch (err) {
      if (current !== seq) return;
      problems.value = [];
      error.value = err instanceof Error ? err.message : '比赛题目加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return {
    loading,
    error,
    problems,
    fetchContestProblems,
  };
}
