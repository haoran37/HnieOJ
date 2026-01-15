import { ref } from 'vue';

export function useHomeworkList() {
  const loading = ref(false);
  const listData = ref<any[]>([]);
  const total = ref(0);
  const page = ref(1);

  const fetchHomeworks = async (params: any) => {
    loading.value = true;
    console.log("Searching Homework with:", params);

    //TODO: 替换真实api
    setTimeout(() => {
      // 模拟返回数据
      listData.value = Array.from({ length: 10 }, (_, i) => {
        const id = 5000 + i;
        //TODO: 应由前端拼接构造
        const sourceStr = `信息科学与工程学院 · 计算机2202 · 某某某`;
        
        return {
          id: String(id),
          title: i % 2 === 0 ? `[作业] 数据结构第 ${i+1} 章练习题` : `[实验] 操作系统实验报告 ${i}`,
          tags: ['必做', '截止: 12-31', '平时分'],
          source: sourceStr,
          beginTime: new Date(Date.now() - 86400000).toISOString(), // 昨天
          endTime: new Date(Date.now() + 86400000 * 3).toISOString(), // 3天后
          participantCount: 45 + i, // 参与人数
        };
      });
      total.value = 56;
      loading.value = false;
    }, 600);
  };

  return {
    loading,
    listData,
    total,
    page,
    fetchHomeworks
  };
}