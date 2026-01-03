import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTagStore = defineStore('tag', () => {
  const tagData = ref<any[]>([]);
  const loading = ref(false);
  
  // 从本地读取持久化的 Hash
  const localHash = ref(localStorage.getItem('tag-data-hash') || '');

  const fetchTags = async () => {
    loading.value = true;
    try {
      // 获取后端计算的最新 Hash 值
      // const { hash: remoteHash } = await api.get('/tags/hash-check');
      const remoteHash = "a1b2c3d4e5f6"; // 模拟后端计算的 MD5/Hash

      // 检查 Hash 是否匹配以及本地是否有数据
      const cachedData = localStorage.getItem('tag-data-content');
      
      if (localHash.value === remoteHash && cachedData) {
        // Hash 一致，直接使用本地缓存
        tagData.value = JSON.parse(cachedData);
        console.log('Hash 匹配，读取本地缓存');
      } else {
        // Hash 不一致或无缓存，拉取全量数据
        console.log('Hash 不匹配，更新全量数据...');
        // const res = await api.get('/tags/all');
        // const fullData = res.data;
        
        const fullData = [
          {
          id: 'algorithm',
          name: '算法',
          groups: [
            { title: '语言入门', tags: ['顺序结构', '分支结构', '循环结构', '数组'] },
            { title: '字符串', tags: ['KMP算法', 'AC自动机', '后缀数组'] },
            { title: '排序与查找', tags: ['快速排序', '归并排序', '二分查找'] },
            { title: '数据结构', tags: ['栈', '队列', '链表', '树', '图'] },
            { title: '数学相关', tags: ['数论', '组合数学', '概率论'] },
            { title: '高级算法', tags: ['动态规划', '贪心算法', '分治算法', '回溯算法'] },
            { title: '语言入门', tags: ['顺序结构', '分支结构', '循环结构', '数组'] },
            { title: '字符串', tags: ['KMP算法', 'AC自动机', '后缀数组'] },
            { title: '排序与查找', tags: ['快速排序', '归并排序', '二分查找'] },
            { title: '数据结构', tags: ['栈', '队列', '链表', '树', '图'] },
            { title: '数学相关', tags: ['数论', '组合数学', '概率论'] },
            { title: '高级算法', tags: ['动态规划', '贪心算法', '分治算法', '回溯算法'] },
            { title: '语言入门', tags: ['顺序结构', '分支结构', '循环结构', '数组'] },
            { title: '字符串', tags: ['KMP算法', 'AC自动机', '后缀数组'] },
            { title: '排序与查找', tags: ['快速排序', '归并排序', '二分查找'] },
            { title: '数据结构', tags: ['栈', '队列', '链表', '树', '图'] },
            { title: '数学相关', tags: ['数论', '组合数学', '概率论'] },
            { title: '高级算法', tags: ['动态规划', '贪心算法', '分治算法', '回溯算法'] },
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

        // 存入本地并更新状态
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
});