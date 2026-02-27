import { ref } from 'vue';

export interface HomeworkDetail {
  id: string;
  title: string;
  courseName: string; 
  beginTime: string;
  deadline: string;
  status: 'active' | 'ended';
  description: string;
  // 仅教师可见
  stats: {
    studentCount: number;
    submittedCount: number;
    averageScore: number;
  };
}

export function useHomeworkDetail() {
  const loading = ref(false);
  const detail = ref<HomeworkDetail>({
    id: '',
    title: '',
    courseName: '',
    beginTime: '',
    deadline: '',
    status: 'active',
    description: '',
    stats: { studentCount: 0, submittedCount: 0, averageScore: 0 }
  });

  //TODO: 替换真实api
  const fetchHomeworkDetail = async (hid: string) => {
    loading.value = true;
    setTimeout(() => {
      const now = new Date();
      const start = new Date(now.getTime() + 3600 * 1);
      const end = new Date(now.getTime() + 3600 * 10);

      detail.value = {
        id: hid,
        title: '第三周作业：数组与链表基础',
        courseName: '2025秋-数据结构与算法(2班)',
        beginTime: start.toISOString(),
        deadline: end.toISOString(),
        status: 'active',
        description: `### 作业要求\n1. 请独立完成所有题目。\n2. 截止日期前可多次提交，**IOI赛制**取最高分。`,
        stats: {
          studentCount: 45,
          submittedCount: 38,
          averageScore: 86.5
        }
      };
      loading.value = false;
    }, 400);
  };

  return { loading, detail, fetchHomeworkDetail };
}
