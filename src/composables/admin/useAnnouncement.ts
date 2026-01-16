import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';

// --- 类型定义 ---
export type AnnounceType = 'NORMAL' | 'MAINTENANCE' | 'CONTEST';

export interface GeneralAnnouncement {
  id: string;
  title: string;
  type: AnnounceType;
  content: string;
  startTime: number | null;
  endTime: number | null;
  requireRead: boolean;
  author: string;
  updateTime: number;
  isDisabled: boolean;
}

export function useAnnouncement() {
  const message = useMessage();
  const loading = ref(false);
  const savingConfig = ref(false);
  const showModal = ref(false);
  const modalMode = ref<'create' | 'edit'>('create');

  // --- 新用户公告配置 ---
  const newUserConfig = reactive({
    enabled: true,
    content: '# 欢迎来到 HnieOJ\n\n很高兴见到你！这里是湖南工程学院在线评测系统...',
    requireRead: true
  });

  // --- 普通公告列表数据 (模拟) ---
  const generalAnnouncements = ref<GeneralAnnouncement[]>([
    {
      id: '1',
      title: '🎉 HnieOJ 平台正式上线啦！',
      type: 'NORMAL',
      content: '欢迎大家使用...',
      startTime: Date.now() - 86400000 * 2,
      endTime: Date.now() + 86400000 * 30,
      requireRead: true,
      author: 'Admin',
      updateTime: Date.now(),
      isDisabled: false
    },
    {
      id: '2',
      title: '系统临时维护通知',
      type: 'MAINTENANCE',
      content: '将于今晚维护...',
      startTime: Date.now() - 86400000 * 5,
      endTime: Date.now() - 86400000 * 1,
      requireRead: false,
      author: 'DevOps',
      updateTime: Date.now() - 86400000 * 2,
      isDisabled: false
    }
  ]);

  // --- 表单模型 ---
  const formModel = reactive({
    id: '',
    title: '',
    type: 'NORMAL' as AnnounceType,
    dateRange: null as [number, number] | null,
    requireRead: false,
    content: ''
  });

  // --- 状态计算 Helper ---
  const getStatus = (row: GeneralAnnouncement) => {
    // [修复] 使用 as const 断言字面量类型，匹配 Naive UI 的 Type 定义
    if (row.isDisabled) return { label: '已停用', type: 'error' as const, isExpired: false };
    
    const now = Date.now();
    if (row.startTime && now < row.startTime) return { label: '未开始', type: 'warning' as const, isExpired: false };
    if (row.endTime && now > row.endTime) return { label: '已过期', type: 'default' as const, isExpired: true };
    
    return { label: '生效中', type: 'success' as const, isExpired: false };
  };

  // --- 交互逻辑 ---
  const openCreateModal = () => {
    modalMode.value = 'create';
    formModel.id = '';
    formModel.title = '';
    formModel.content = '';
    formModel.type = 'NORMAL';
    formModel.requireRead = false;
    formModel.dateRange = [Date.now(), Date.now() + 86400000 * 7];
    showModal.value = true;
  };

  const handleEdit = (row: GeneralAnnouncement) => {
    modalMode.value = 'edit';
    formModel.id = row.id;
    formModel.title = row.title;
    formModel.content = row.content;
    formModel.type = row.type;
    formModel.requireRead = row.requireRead;
    if (row.startTime && row.endTime) {
      formModel.dateRange = [row.startTime, row.endTime];
    } else {
      formModel.dateRange = null;
    }
    showModal.value = true;
  };

  const toggleActive = (row: GeneralAnnouncement) => {
    row.isDisabled = !row.isDisabled;
    row.updateTime = Date.now();
    message.success(row.isDisabled ? '公告已停用' : '公告已激活');
  };

  const handleSubmit = () => {
    if (!formModel.title || !formModel.content) {
      message.error('请填写完整信息');
      return;
    }
    
    loading.value = true;
    setTimeout(() => {
      const newData: GeneralAnnouncement = {
        id: formModel.id || Date.now().toString(),
        title: formModel.title,
        type: formModel.type,
        content: formModel.content,
        requireRead: formModel.requireRead,
        startTime: formModel.dateRange ? formModel.dateRange[0] : null,
        endTime: formModel.dateRange ? formModel.dateRange[1] : null,
        author: 'Admin',
        updateTime: Date.now(),
        isDisabled: false
      };

      if (modalMode.value === 'create') {
        generalAnnouncements.value.unshift(newData);
        message.success('发布成功');
      } else {
        const index = generalAnnouncements.value.findIndex(i => i.id === newData.id);
        if (index !== -1) generalAnnouncements.value[index] = newData;
        message.success('更新成功');
      }
      
      showModal.value = false;
      loading.value = false;
    }, 500);
  };

  const handleDelete = (id: string) => {
    generalAnnouncements.value = generalAnnouncements.value.filter(i => i.id !== id);
    message.success('已删除');
  };

  const saveNewUserConfig = () => {
    savingConfig.value = true;
    setTimeout(() => {
      savingConfig.value = false;
      message.success('新用户欢迎页配置已更新');
    }, 800);
  };

  return {
    loading,
    savingConfig,
    showModal,
    modalMode,
    newUserConfig,
    generalAnnouncements,
    formModel,
    openCreateModal,
    handleEdit,
    toggleActive,
    handleSubmit,
    handleDelete,
    saveNewUserConfig,
    getStatus
  };
}