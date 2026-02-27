import { ref, watch, nextTick } from 'vue';
import { useMessage } from 'naive-ui';

export interface TagGroup {
  _id: string; // Frontend only ID for animation
  title: string;
  tags: string[];
}

export function useTagManage() {
  const message = useMessage();
  const loading = ref(false);
  const tagGroups = ref<TagGroup[]>([]);
  const jsonString = ref('');
  const jsonError = ref<string | null>(null);
  
  // Flag to prevent circular updates
  let isUpdatingFromJson = false;

  // Mock API: Fetch Tags
  const fetchTagGroups = async () => {
    loading.value = true;
    console.log('API Request: GET /api/admin/tags');
    try {
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data
      const rawData = [
        { title: '语言入门', tags: ['顺序结构', '分支结构', '循环结构', '数组'] },
        { title: '数据结构', tags: ['栈', '队列', '链表', '树', '图'] },
        { title: '算法基础', tags: ['模拟', '枚举', '递归', '贪心', '二分'] }
      ];
      
      // Add frontend IDs
      tagGroups.value = rawData.map(item => ({
        ...item,
        _id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }));
      
      // Initial sync (exclude _id)
      jsonString.value = JSON.stringify(rawData, null, 2);
    } catch (e) {
      console.error(e);
      message.error('获取标签数据失败');
    } finally {
      loading.value = false;
    }
  };

  // Mock API: Save Tags
  const saveTagGroups = async () => {
    if (jsonError.value) {
      message.error('请先修复 JSON 格式错误');
      return;
    }
    
    loading.value = true;
    // Strip _id before sending
    const payload = tagGroups.value.map((group) => {
      const { _id: _omitId, ...rest } = group;
      return rest;
    });
    console.log('API Request: PUT /api/admin/tags', payload);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      message.success('保存成功');
    } catch (e) {
      console.error(e);
      message.error('保存失败');
    } finally {
      loading.value = false;
    }
  };

  // UI Operations
  const addTagGroup = () => {
    tagGroups.value.push({ 
      _id: Date.now().toString(), 
      title: '新分类', 
      tags: [] 
    });
  };

  const removeTagGroup = (index: number) => {
    tagGroups.value.splice(index, 1);
  };

  const moveTagGroup = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const item = tagGroups.value.splice(index, 1)[0];
      if (item) tagGroups.value.splice(index - 1, 0, item);
    } else if (direction === 'down' && index < tagGroups.value.length - 1) {
      const item = tagGroups.value.splice(index, 1)[0];
      if (item) tagGroups.value.splice(index + 1, 0, item);
    }
  };

  // JSON Handling
  const handleJsonInput = (value: string) => {
    jsonString.value = value;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // Validate structure
        const isValid = parsed.every(item => 
          typeof item === 'object' && 
          item !== null && 
          'title' in item && 
          Array.isArray(item.tags)
        );
        
        if (isValid) {
          isUpdatingFromJson = true;
          // Preserve existing IDs if possible, or generate new ones
          // This helps maintain animation stability if user edits JSON but keeps structure
          tagGroups.value = parsed.map((item: any, index: number) => {
            const existing = tagGroups.value[index];
            return {
              ...item,
              _id: existing ? existing._id : (Date.now().toString() + Math.random().toString(36).substr(2, 9))
            };
          });
          jsonError.value = null;
          nextTick(() => {
            isUpdatingFromJson = false;
          });
        } else {
          jsonError.value = '数据格式错误：应为包含 title 和 tags 数组的对象列表';
        }
      } else {
        jsonError.value = '数据格式错误：根节点应为数组';
      }
    } catch (e) {
      jsonError.value = 'JSON 解析错误: ' + (e as Error).message;
    }
  };

  const exportJson = () => {
    if (jsonError.value) {
      message.warning('当前 JSON 格式有误，无法导出');
      return;
    }
    // Copy to clipboard or download
    navigator.clipboard.writeText(jsonString.value).then(() => {
      message.success('配置已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
    console.log('Export Data:', jsonString.value);
  };

  // Watch for UI changes to update JSON
  watch(tagGroups, (newVal) => {
    if (!isUpdatingFromJson) {
      // Strip _id before stringifying
      const cleanData = newVal.map((group) => {
        const { _id: _omitId, ...rest } = group;
        return rest;
      });
      jsonString.value = JSON.stringify(cleanData, null, 2);
      jsonError.value = null;
    }
  }, { deep: true });

  return {
    loading,
    tagGroups,
    jsonString,
    jsonError,
    fetchTagGroups,
    saveTagGroups,
    addTagGroup,
    removeTagGroup,
    moveTagGroup,
    handleJsonInput,
    exportJson
  };
}
