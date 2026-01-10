import { ref } from 'vue';
import type { MessageApi } from 'naive-ui';

export interface TestPoint {
  id: number;
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
  score: number;
  timeUsed: string;
  memoryUsed: string;
  submitTime: string;
  judgeTime: string;
  codeLength: string;
  code: string;
  compilerOutput?: string; // 编译器信息
  testPoints: TestPoint[];
}

export function useStatusDetail() {
  const loading = ref(false);
  const detail = ref<StatusDetail | null>(null);

  //INFO: 后端记得实现api权限校验，STUDENT 只能查看自己的提交
  //TODO: 替换真实api
  const fetchStatusDetail = async (runId: string) => {
    loading.value = true;
    
    setTimeout(() => {
      const isAC = Math.random() > 0.5;
      detail.value = {
        id: runId,
        problemId: 'P1001',
        problemTitle: 'A + B Problem',
        author: 'MyUserAccount',
        authorId: '202202050231', 
        language: 'C++17(O2)',
        status: isAC ? 'Accepted' : 'Wrong Answer',
        score: isAC ? 100 : 40,
        timeUsed: '52ms',
        memoryUsed: '592KiB',
        submitTime: '2026-01-10 13:54:02',
        judgeTime: '2026-01-10 13:54:03',
        codeLength: '124 Bytes',
        code: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
        compilerOutput: isAC ? '' : 'Test case 3 failed: Expected "4", got "3".\nError at line 10.',
        testPoints: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          status: isAC || i < 5 ? 'Accepted' : 'Wrong Answer',
          score: isAC || i < 4 ? 10 : 0,
          time: `${Math.floor(Math.random() * 10)}ms`,
          memory: '504KiB'
        }))
      };
      loading.value = false;
    }, 400);
  };

  //TODO: 实现逻辑
  const rejudge = async (runId: string, message: MessageApi) => {
    message.loading('重测请求已提交...');
    setTimeout(() => {
      message.success('重测成功');
      fetchStatusDetail(runId);
    }, 800);
  };

  return {
    loading,
    detail,
    fetchStatusDetail,
    rejudge
  };
}