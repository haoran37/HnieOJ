import { ref } from 'vue';

export function useContestProblems() {
  const loading = ref(false);
  const problems = ref<any[]>([]);

  //TODO: 替换真实api
  const fetchContestProblems = async (cid: string) => {
    console.log("请求题目");
    loading.value = true;
    setTimeout(() => {
      problems.value = [
        { id: '1001', title: '签到题 A', accepted: 120, submitted: 130 },
        { id: '1002', title: '简单的字符串', accepted: 80, submitted: 200 },
        { id: '1005', title: '动态规划入门', accepted: 45, submitted: 150 },
        { id: '1008', title: '图论基础', accepted: 10, submitted: 80 },
        { id: '1012', title: '神秘的数论', accepted: 2, submitted: 20 },
      ];
      loading.value = false;
    }, 400);
  };

  // 生成题号 A, B, C... AA
  const getProblemIndex = (index: number) => {
    let res = '';
    let n = index;
    do {
      res = String.fromCharCode((n % 26) + 65) + res;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return res;
  };

  return {
    loading,
    problems,
    fetchContestProblems,
    getProblemIndex
  };
}