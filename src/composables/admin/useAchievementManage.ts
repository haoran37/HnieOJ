import { ref, reactive, computed } from 'vue';
import { useMessage, useDialog } from 'naive-ui';

export interface AchievementApplication {
  id: string;
  uid: string;
  username: string;
  college: string;
  class: string;
  title: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submitTime: number;
}

export function useAchievementManage() {
  const message = useMessage();
  const dialog = useDialog();

  const loading = ref(false);
  const submitting = ref(false);
  const selectedIds = ref<string[]>([]);
  const showRejectModal = ref(false);
  const rejectReason = ref('');
  const currentRejectId = ref<string | null>(null);

  const showFileModal = ref(false);
  const previewFileUrl = ref('');
  const previewFileType = ref<'image' | 'pdf'>('image');

  const filters = reactive({
    keyword: '',
    status: null as string | null,
    college: null as string | null
  });

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
    }
  });

  // Mock 数据
  const list = ref<AchievementApplication[]>([
    {
      id: '1',
      uid: '202202050231',
      username: 'student01',
      college: '信息科学与工程学院',
      class: '计算机2202',
      title: '第十四届蓝桥杯全国软件和信息技术专业人才大赛省赛一等奖',
      fileUrl: 'https://via.placeholder.com/800x600.png?text=Certificate',
      fileType: 'image',
      description: 'Java软件开发大学B组',
      status: 'pending',
      submitTime: Date.now() - 3600000
    },
    {
      id: '2',
      uid: '202202050232',
      username: 'student02',
      college: '信息科学与工程学院',
      class: '软件2201',
      title: '2023年全国大学生计算机设计大赛国赛二等奖',
      fileUrl: 'https://via.placeholder.com/800x600.png?text=Certificate2',
      fileType: 'image',
      description: 'Web应用开发',
      status: 'approved',
      submitTime: Date.now() - 86400000
    },
    {
      id: '3',
      uid: '202202050233',
      username: 'student03',
      college: '电气工程学院',
      class: '电气2201',
      title: '校级奖学金',
      fileUrl: '',
      fileType: 'pdf',
      description: '2022-2023学年一等奖学金',
      status: 'rejected',
      submitTime: Date.now() - 86400000 * 2
    }
  ]);

  const statusOptions = [
    { label: '待处理', value: 'pending' },
    { label: '通过', value: 'approved' },
    { label: '打回', value: 'rejected' }
  ];

  const collegeOptions = [
    { label: '信息科学与工程学院', value: '信息科学与工程学院' },
    { label: '电气工程学院', value: '电气工程学院' },
    { label: '机械工程学院', value: '机械工程学院' }
  ];

  const filteredList = computed(() => {
    return list.value.filter(item => {
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        if (!item.username.toLowerCase().includes(kw) && 
            !item.uid.includes(kw) && 
            !item.title.toLowerCase().includes(kw)) {
          return false;
        }
      }
      if (filters.status && item.status !== filters.status) return false;
      if (filters.college && item.college !== filters.college) return false;
      return true;
    });
  });

  const resetFilters = () => {
    filters.keyword = '';
    filters.status = null;
    filters.college = null;
  };

  const handlePreview = (row: AchievementApplication) => {
    previewFileUrl.value = row.fileUrl;
    previewFileType.value = row.fileType;
    showFileModal.value = true;
  };

  const handleApprove = (row: AchievementApplication) => {
    dialog.success({
      title: '通过确认',
      content: `确定要通过 "${row.username}" 的 "${row.title}" 申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        // TODO: API call
        console.log('Approve:', row.id);
        row.status = 'approved';
        message.success('已通过');
      }
    });
  };

  const openRejectModal = (row: AchievementApplication) => {
    currentRejectId.value = row.id;
    rejectReason.value = '';
    showRejectModal.value = true;
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.value) {
      message.warning('请输入打回原因');
      return;
    }
    submitting.value = true;
    
    // TODO: API call
    console.log('Reject:', currentRejectId.value, rejectReason.value);
    
    setTimeout(() => {
      const item = list.value.find(i => i.id === currentRejectId.value);
      if (item) {
        item.status = 'rejected';
      }
      message.success('已打回，邮件已发送');
      submitting.value = false;
      showRejectModal.value = false;
    }, 500);
  };

  const handleBatchApprove = () => {
    dialog.success({
      title: '批量通过确认',
      content: `确定要通过选中的 ${selectedIds.value.length} 个申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        // TODO: API call
        console.log('Batch Approve:', selectedIds.value);
        
        list.value.forEach(item => {
          if (selectedIds.value.includes(item.id) && item.status === 'pending') {
            item.status = 'approved';
          }
        });
        
        message.success(`已通过 ${selectedIds.value.length} 个申请`);
        selectedIds.value = [];
      }
    });
  };

  return {
    loading,
    submitting,
    selectedIds,
    showRejectModal,
    rejectReason,
    showFileModal,
    previewFileUrl,
    previewFileType,
    filters,
    pagination,
    list,
    filteredList,
    statusOptions,
    collegeOptions,
    resetFilters,
    handlePreview,
    handleApprove,
    openRejectModal,
    handleRejectSubmit,
    handleBatchApprove
  };
}
