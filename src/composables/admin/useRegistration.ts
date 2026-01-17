import { ref, reactive, computed } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';

export interface RegistrationItem {
  uid: string;
  name: string;
  major: string;
  college: string;
  qq: string;
  phone: string;
  email: string;
  ip: string;
  submitTime: number;
  approveTime: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
}

export function useRegistration() {
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
  
  //TODO: 从后端获取数据
  const registrationList = ref<RegistrationItem[]>([
    {
      uid: '202202050234',
      name: '张三',
      major: '计算机2202',
      college: '信息科学与工程学院',
      qq: '123456789',
      phone: '13800138000',
      email: 'zhangsan@example.com',
      ip: '192.168.1.100',
      submitTime: Date.now() - 86400000,
      approveTime: 0,
      status: 'pending'
    },
    {
      uid: '202202050235',
      name: '李四',
      major: '软件2201',
      college: '信息科学与工程学院',
      qq: '987654321',
      phone: '13900139000',
      email: 'lisi@example.com',
      ip: '192.168.1.101',
      submitTime: Date.now() - 172800000,
      approveTime: Date.now() - 86400000,
      status: 'approved'
    },
    {
      uid: '202202050236',
      name: '王五',
      major: '网络2201',
      college: '信息科学与工程学院',
      qq: '555666777',
      phone: '13700137000',
      email: 'wangwu@example.com',
      ip: '192.168.1.102',
      submitTime: Date.now() - 259200000,
      approveTime: Date.now() - 172800000,
      status: 'rejected',
      rejectReason: '信息不完整'
    }
  ]);
  
  const paginatedList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return registrationList.value.slice(start, end);
  });
  
  const totalCount = computed(() => registrationList.value.length);
  
  const handleApprove = async (item: RegistrationItem) => {
    submitting.value = true;
    
    console.log('API: POST /api/registrations/' + item.uid + '/approve - 通过注册申请');
    
    setTimeout(() => {
      const index = registrationList.value.findIndex(r => r.uid === item.uid);
      if (index !== -1 && registrationList.value[index]) {
        registrationList.value[index]!.status = 'approved';
        registrationList.value[index]!.approveTime = Date.now();
      }
      message.success('已通过');
      submitting.value = false;
    }, 500);
  };
  
  const openRejectModal = (item: RegistrationItem) => {
    rejectForm.uid = item.uid;
    rejectForm.name = item.name;
    rejectForm.email = item.email;
    rejectForm.reason = '';
    showRejectModal.value = true;
  };
  
  const handleRejectSubmit = async () => {
    if (!rejectForm.reason.trim()) {
      message.warning('请输入打回原因');
      return;
    }
    
    submitting.value = true;
    
    console.log('API: POST /api/registrations/' + rejectForm.uid + '/reject - 打回注册申请', {
      reason: rejectForm.reason,
      email: rejectForm.email
    });
    
    setTimeout(() => {
      const index = registrationList.value.findIndex(r => r.uid === rejectForm.uid);
      if (index !== -1 && registrationList.value[index]) {
        registrationList.value[index]!.status = 'rejected';
        registrationList.value[index]!.rejectReason = rejectForm.reason;
        registrationList.value[index]!.approveTime = Date.now();
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
        console.log('API: POST /api/registrations/batch/approve - 批量通过', { uids: selectedIds.value });
        
        registrationList.value.forEach(item => {
          if (selectedIds.value.includes(item.uid)) {
            item.status = 'approved';
            item.approveTime = Date.now();
          }
        });
        message.success(`已通过 ${selectedIds.value.length} 个申请`);
        selectedIds.value = [];
      }
    });
  };
  
  const handleUploadExcel = async (file: File) => {
    submitting.value = true;
    
    console.log('API: POST /api/registrations/import - 上传Excel自动审核', file);
    
    setTimeout(() => {
      message.success('Excel导入成功，已自动审核');
      submitting.value = false;
    }, 1000);
  };
  
  return {
    loading,
    submitting,
    registrationList,
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
    handleUploadExcel,
    formatFullTime
  };
}
