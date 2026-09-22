import { ref, reactive } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import {
  approveRegistration,
  batchApproveRegistrations,
  getRegistrations,
  importRegistrations,
  rejectRegistration,
  type RegistrationApplyVo,
  type RegistrationImportResultVo,
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

  // 导入注册名单：文件与结果只保留在当前弹窗会话内，关闭即清理
  const showImportModal = ref(false);
  const importFile = ref<File | null>(null);
  const importResult = ref<RegistrationImportResultVo | null>(null);

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
        // 双击确认按钮不得重复发起审批请求；返回 false 让对话框保持打开
        if (submitting.value) return false;
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

    if (submitting.value) return false;
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
        // 双击确认按钮不得重复发起批量审批请求；返回 false 让对话框保持打开
        if (submitting.value) return false;
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

  // ---- 导入注册名单（真实上传 POST /api/registrations/import） ----
  const IMPORT_FILE_EXTENSIONS = ['.xls', '.xlsx'];

  const resetImportState = () => {
    importFile.value = null;
    importResult.value = null;
  };

  const openImportModal = () => {
    // 新一次打开不沿用上一次的文件与结果
    resetImportState();
    showImportModal.value = true;
  };

  /** n-modal 关闭动画结束后兜底清理：覆盖右上角关闭/Esc 等非按钮关闭路径 */
  const handleImportModalAfterLeave = () => {
    resetImportState();
  };

  /**
   * 校验并暂存待导入名单文件。
   * 空选择/空文件/错误后缀一律拒绝并返回 false，调用方不得发起请求。
   */
  const handleImportFileChange = (file: File | null): boolean => {
    // 导入在途不得更换文件
    if (submitting.value) return false;
    // 待导入文件始终只有一份：被拒/移除后不留旧选择（结果保留到下次导入或关闭弹窗）
    importFile.value = null;
    if (!file) return false;
    const name = file.name.toLowerCase();
    if (!IMPORT_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      message.warning('仅支持 .xls / .xlsx 格式的 Excel 文件');
      return false;
    }
    if (file.size === 0) {
      message.warning('文件内容为空，请重新选择');
      return false;
    }
    importFile.value = file;
    return true;
  };

  /** 关闭导入弹窗；导入在途禁止关闭 */
  const closeImportModal = (): boolean => {
    if (submitting.value) return false;
    showImportModal.value = false;
    resetImportState();
    return true;
  };

  const handleImport = async () => {
    // 与通过/打回/批量通过共享同一把提交锁：在途时重复点击不再发请求
    if (submitting.value) return;
    const file = importFile.value;
    if (!file) {
      message.warning('请先选择要导入的 Excel 名单文件');
      return;
    }
    submitting.value = true;
    importResult.value = null;
    try {
      const result = await importRegistrations(file);
      importResult.value = result;
      const success = result?.successCount ?? 0;
      const failed = result?.failedCount ?? 0;
      if (failed > 0 && success > 0) {
        message.warning(`部分成功：成功 ${success} 条，失败 ${failed} 条，请只修正失败行后再上传`);
      } else if (failed > 0) {
        message.error(`导入失败：成功 0 条，失败 ${failed} 条，请修正失败行后再上传`);
      } else {
        message.success(`导入成功 ${success} 条`);
      }
      // 后端已返回结果：清空原文件，避免整份原文件被再次提交导致成功行重复导入
      importFile.value = null;
      if (success > 0) {
        await fetchRegistrations();
      }
    } catch (err) {
      // HTTP/网络失败：保留已选文件与真实错误以便重试，且不显示任何成功结果
      message.error(err instanceof Error ? err.message : '导入注册名单失败');
    } finally {
      submitting.value = false;
    }
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
    showImportModal,
    importFile,
    importResult,
    fetchRegistrations,
    resetFilters,
    handleApprove,
    openRejectModal,
    handleRejectSubmit,
    handleBatchApprove,
    openImportModal,
    closeImportModal,
    handleImportModalAfterLeave,
    handleImportFileChange,
    handleImport,
    formatFullTime,
  };
}
