import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  // AC 的题目 ID 列表
  const acceptedProblems = ref<Set<string>>(new Set(['1001', '1003', '1005', '1007']));
  // 尝试过但错误的题目 ID 列表
  const wrongProblems = ref<Set<string>>(new Set(['1002', '1006']));

  // 检查题目状态: 'AC' | 'WA' | 'TODO'
  const getProblemStatus = (pid: string) => {
    if (acceptedProblems.value.has(pid)) return 'AC';
    if (wrongProblems.value.has(pid)) return 'WA';
    return 'TODO';
  };

  return { acceptedProblems, wrongProblems, getProblemStatus };
});