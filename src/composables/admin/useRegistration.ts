import { ref, reactive } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import {
  approveRegistration,
  batchApproveRegistrations,
  getRegistrations,
  rejectRegistration,
  type RegistrationApplyVo,
} from '@/utils/api';

// 对应后端 RegisterStatus
export const REGISTER_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;

export interface RegistrationItem {
  uid: string;
  username: string;
  email: string;
  college: string;
  major: string;
  grade: string;
  qq: string;
  status: number;
  replyInfo: string;
  submitTime: number;
}

/** 后端 RegistrationApplyVo -> 页面行（status 为整数，不做字符串假设） */
export function toRegistrationItem(vo: RegistrationApplyVo): RegistrationItem {
  return {
    uid: vo.uid,
    username: vo.username ?? '',
    email: vo.email ?? '',
    college: vo.collegeName ?? '',
    major: vo.className ?? '',
    grade: vo.grade ?? '',
    qq: vo.qq ?? '',
    status: vo.status ?? REGISTER_STATUS.PENDING,
    replyInfo: vo.replyInfo ?? '',
    submitTime: vo.submitTime ?? 0,
  };
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
    reason: '',
  });

  const selectedIds = ref<string[]>([]);
  const keyword = ref('');
  const statusFilter = ref<number | null>(null);

  const registrationList = ref<RegistrationItem[]>([]);
  const totalCount = ref(0);

  const pagination = reactive({
    page: 1,
    pageSize: 15,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 15, 20, 30, 50],
    onChange: (page: number) => {
      pagination.page = page;
      void fetchRegistrations();
    },
    onUpdatePageSize: (size: number) => {
      pagination.pageSize = size;
      pagination.page = 1;
      void fetchRegistrations();
    },
  });

  // 请求序号：迟到的旧响应不得覆盖新筛选/新分页的结果
  let listSeq = 0;

  const fetchRegistrations = async () => {
    const current = ++listSeq;
    loading.value = true;
    try {
      const data = await getRegistrations(
        pagination.page,
        pagination.pageSize,
        statusFilter.value ?? undefined,
        keyword.value,
      );
      if (current !== listSeq) return;
      const rows = (data?.list ?? []).map(toRegistrationItem);
      // 审批后当前页可能被清空：回退上一页重读，不停留在空页
      if (rows.length === 0 && pagination.page > 1) {
        pagination.page -= 1;
        void fetchRegistrations();
        return;
      }
      registrationList.value = rows;
      totalCount.value = data?.total ?? 0;
      pagination.itemCount = totalCount.value;
    } catch (err) {
      if (current !== listSeq) return;
      registrationList.value = [];
      totalCount.value = 0;
      pagination.itemCount = 0;
      message.error(err instanceof Error ? err.message : '加载注册申请失败');
    } finally {
      if (current === listSeq) loading.value = false;
    }
  };

  const resetFilters = () => {
    keyword.value = '';
    statusFilter.value = null;
    pagination.page = 1;
    void fetchRegistrations();
  };

  const handleApprove = async (item: RegistrationItem) => {
    dialog.success({
      title: '通过确认',
      content: `确定要通过 "${item.username}" (${item.uid}) 的注册申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起审批请求
        if (submitting.value) return;
        submitting.value = true;
        try {
          await approveRegistration(item.uid);
          message.success('已通过');
          await fetchRegistrations();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '通过注册申请失败');
        } finally {
          submitting.value = false;
        }
      },
    });
  };

  const openRejectModal = (item: RegistrationItem) => {
    rejectForm.uid = item.uid;
    rejectForm.name = item.username;
    rejectForm.email = item.email;
    rejectForm.reason = '';
    showRejectModal.value = true;
  };

  const handleRejectSubmit = async () => {
    if (!rejectForm.reason.trim()) {
      message.warning('请输入打回原因');
      return;
    }

    if (submitting.value) return;
    submitting.value = true;
    try {
      await rejectRegistration(rejectForm.uid, rejectForm.reason.trim());
      message.success('已打回');
      showRejectModal.value = false;
      await fetchRegistrations();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '打回注册申请失败');
    } finally {
      submitting.value = false;
    }
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
      onPositiveClick: async () => {
        // 双击确认按钮不得重复发起批量审批请求
        if (submitting.value) return;
        submitting.value = true;
        try {
          const summary = await batchApproveRegistrations([...selectedIds.value]);
          message.success(summary ? `批量通过完成（${summary}）` : '批量通过完成');
          selectedIds.value = [];
          await fetchRegistrations();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '批量通过失败');
        } finally {
          submitting.value = false;
        }
      },
    });
  };

  return {
    loading,
    submitting,
    registrationList,
    totalCount,
    selectedIds,
    keyword,
    statusFilter,
    pagination,
    showRejectModal,
    rejectForm,
    fetchRegistrations,
    resetFilters,
    handleApprove,
    openRejectModal,
    handleRejectSubmit,
    handleBatchApprove,
    formatFullTime,
  };
}
