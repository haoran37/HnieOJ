import { ref, reactive, computed } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';

export interface ChangeItem {
  uid: string;
  name: string;
  reason: string;
  originalContent: {
    name?: string;
    uid?: string;
    college?: string;
    class?: string;
  };
  modifiedContent: {
    name?: string;
    uid?: string;
    college?: string;
    class?: string;
  };
  submitTime: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
}

export function useUserChange() {
  const message = useMessage();
  const dialog = useDialog();
  
  const loading = ref(false);
  const submitting = ref(false);
  
  const showRejectModal = ref(false);
  const rejectForm = reactive({
    uid: '',
    name: '',
    email: '',
    reason: ''
  });
  
  const selectedIds = ref<string[]>([]);
  const currentPage = ref(1);
  const pageSize = ref(15);
  
  //TODO: 通过后台获取数据
  const changeList = ref<ChangeItem[]>([
    {
      uid: '202202050234',
      name: '张三',
      reason: '信息填写错误',
      originalContent: {
        name: '张三',
        college: '信息科学与工程学院',
        class: '计算机2201'
      },
      modifiedContent: {
        name: '张三',
        college: '信息科学与工程学院',
        class: '计算机2202'
      },
      submitTime: Date.now() - 86400000,
      status: 'pending'
    },
    {
      uid: '202202050235',
      name: '李四',
      reason: '转专业/班级变动',
      originalContent: {
        uid: '202202050235',
        college: '信息科学与工程学院'
      },
      modifiedContent: {
        uid: '202202050236',
        college: '计算机科学与技术学院'
      },
      submitTime: Date.now() - 172800000,
      status: 'approved'
    },
    {
      uid: '202202050237',
      name: '王五',
      reason: '其他',
      originalContent: {
        name: '王五'
      },
      modifiedContent: {
        name: '王武'
      },
      submitTime: Date.now() - 259200000,
      status: 'rejected',
      rejectReason: '修改理由不充分'
    }
  ]);
  
  const paginatedList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return changeList.value.slice(start, end);
  });
  
  const totalCount = computed(() => changeList.value.length);
  
  const handleApprove = async (item: ChangeItem) => {
    submitting.value = true;
    
    // RESTful API: 通过用户信息修改申请
    console.log('API: PUT /api/users/' + item.uid + '/changes/approve - 通过用户信息修改申请');
    
    setTimeout(() => {
      const index = changeList.value.findIndex(r => r.uid === item.uid);
      if (index !== -1 && changeList.value[index]) {
        changeList.value[index]!.status = 'approved';
      }
      message.success('已通过');
      submitting.value = false;
    }, 500);
  };
  
  const openRejectModal = (item: ChangeItem) => {
    rejectForm.uid = item.uid;
    rejectForm.name = item.name;
    rejectForm.email = `${item.uid}@example.com`;
    rejectForm.reason = '';
    showRejectModal.value = true;
  };
  
  const handleRejectSubmit = async () => {
    if (!rejectForm.reason.trim()) {
      message.warning('请输入打回原因');
      return;
    }
    
    submitting.value = true;
    
    // RESTful API: 打回用户信息修改申请
    console.log('API: PUT /api/users/' + rejectForm.uid + '/changes/reject - 打回用户信息修改申请', {
      reason: rejectForm.reason,
      email: rejectForm.email
    });
    
    setTimeout(() => {
      const index = changeList.value.findIndex(r => r.uid === rejectForm.uid);
      if (index !== -1 && changeList.value[index]) {
        changeList.value[index]!.status = 'rejected';
        changeList.value[index]!.rejectReason = rejectForm.reason;
      }
      message.success('已打回，原因已通过邮件发送');
      submitting.value = false;
      showRejectModal.value = false;
    }, 500);
  };
  
  const handleBatchApprove = () => {
    if (selectedIds.value.length === 0) {
      message.warning('请先选择要通过的项');
      return;
    }
    
    dialog.info({
      title: '批量通过确认',
      content: `确定要通过选中的 ${selectedIds.value.length} 个申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        // API: 批量通过用户信息修改申请
        console.log('API: PUT /api/users/changes/batch-approve - 批量通过用户信息修改申请', { uids: selectedIds.value });
        
        changeList.value.forEach(item => {
          if (selectedIds.value.includes(item.uid)) {
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
    changeList,
    paginatedList,
    totalCount,
    selectedIds,
    currentPage,
    pageSize,
    showRejectModal,
    rejectForm,
    handleApprove,
    openRejectModal,
    handleRejectSubmit,
    handleBatchApprove,
    formatFullTime
  };
}
