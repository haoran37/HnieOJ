import { ref } from 'vue';

export function useTags() {
  const tagData = ref<any[]>([]);
  const loading = ref(false);
  const localHash = ref(localStorage.getItem('tag-data-hash') || '');

  // 使用Hash判断Tag数据是否发生变化来决定是否请求全部Tag数据
  const fetchTags = async () => {
    loading.value = true;
    try {
      // TODO: 获取后端 Hash
      // const { hash: remoteHash } = await api.get('/tags/hash-check');
      const remoteHash = "a1b2c3d4e5af6"; 

      const cachedData = localStorage.getItem('tag-data-content');
      
      if (localHash.value === remoteHash && cachedData) {
        tagData.value = JSON.parse(cachedData);
        console.log('Hash 匹配，读取本地缓存');
      } else {
        console.log('Hash 不匹配，更新全量数据...');
        // TODO: 替换为真实 API
        // const res = await api.get('/tags/all');
        
        // 模拟数据
        const fullData = [
          {
            id: 'algorithm',
            name: '算法',
            groups: [
              { title: '语言入门', tags: ['顺序结构', '分支结构', '循环结构', '数组'] },
              { title: '数据结构', tags: ['栈', '队列', '链表', '树', '图'] },
            ]
          },
          {
            id: 'source',
            name: '来源',
            groups: [
              { title: '正式比赛', tags: ['2023校赛', 'ICPC区域赛'] },
              { title: '外部题库', tags: ['Codeforces', 'LeetCode'] }
            ]
          }
        ];

        tagData.value = fullData;
        localHash.value = remoteHash;
        localStorage.setItem('tag-data-hash', remoteHash);
        localStorage.setItem('tag-data-content', JSON.stringify(fullData));
      }
    } catch (error) {
      console.error('标签数据校验失败:', error);
    } finally {
      loading.value = false;
    }
  };

  return { tagData, loading, fetchTags };
}