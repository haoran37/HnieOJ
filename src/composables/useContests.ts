import { ref } from 'vue';

export interface Contest {
  id: string;
  title: string;
  tags: string[];
  source: string;
  beginTime: string; // ISO string
  endTime: string;   // ISO string
  participantCount: number;
  type: 'INTERNAL' | 'EXTERNAL' | 'USER'; // 校内 | 校外 | 自主
}

export function useContests() {
  const loading = ref(false);
  const activeTab = ref<'INTERNAL' | 'EXTERNAL' | 'USER'>('INTERNAL');
  const page = ref(1);
  const total = ref(0);
  const contestList = ref<Contest[]>([]);

  //TODO: 替换真实api
  const fetchContests = async () => {
    loading.value = true;
    try {
      console.log(`Fetching contests: Type=${activeTab.value}, Page=${page.value}`);
      
      // 模拟 API 延迟
      setTimeout(() => {
        const now = Date.now();
        const oneDay = 86400000;

        // 模拟生成数据
        contestList.value = Array.from({ length: 10 }, (_, i) => {
          const id = (page.value - 1) * 10 + i;
          
          // 随机生成时间状态：0-未开始，1-进行中，2-已结束
          const stateRandom = Math.random();
          let begin, end;

          if (stateRandom < 0.33) {
            // 未开始 (未来 1-10 天)
            begin = new Date(now + oneDay * (Math.random() * 10 + 1)).toISOString();
            end = new Date(new Date(begin).getTime() + oneDay * 0.2).toISOString();
          } else if (stateRandom < 0.66) {
            // 进行中 (开始于过去，结束于未来)
            begin = new Date(now - oneDay * 0.1).toISOString();
            end = new Date(now + oneDay * 0.4).toISOString();
          } else {
            // 已结束
            end = new Date(now - oneDay * (Math.random() * 5 + 1)).toISOString();
            begin = new Date(new Date(end).getTime() - oneDay * 0.2).toISOString();
          }

          return {
            id: String(id),
            title: activeTab.value === 'INTERNAL' 
              ? `HNIE 第 ${20 + id} 届程序设计校赛` 
              : activeTab.value === 'EXTERNAL' 
                ? `Codeforces Round #${900 + id} (Div. 2)`
                : `用户 User_${id} 的个人练习赛`,
            tags: activeTab.value === 'INTERNAL' 
              ? ['校赛', 'ICPC规则', '团队赛'] 
              : ['Rated', 'Div.2', 'Solo'],
            source: activeTab.value === 'INTERNAL' ? 'HNIEOJ' : 'Codeforces',
            beginTime: begin,
            endTime: end,
            participantCount: Math.floor(Math.random() * 500) + 50,
            type: activeTab.value
          };
        });
        
        total.value = 45;
        loading.value = false;
      }, 600);
    } catch (e) {
      console.error(e);
      loading.value = false;
    }
  };

  const handleTabChange = (tab: 'INTERNAL' | 'EXTERNAL' | 'USER') => {
    activeTab.value = tab;
    page.value = 1;
    fetchContests();
  };

  const handlePageChange = (p: number) => {
    page.value = p;
    fetchContests();
  };

  return {
    loading,
    activeTab,
    page,
    total,
    contestList,
    fetchContests,
    handleTabChange,
    handlePageChange
  };
}