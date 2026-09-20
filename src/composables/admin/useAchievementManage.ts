import { ref, reactive } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import {
  approveAchievement,
  downloadAchievementApplyFile,
  getAdminAchievements,
  getColleges,
  rejectAchievement,
  type AchievementApplyAdminVo,
} from '@/utils/api';
import { saveBlob } from '@/utils/download';

export const ACHIEVEMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export interface AchievementApplication {
  id: number;
  uid: string;
  username: string;
  title: string;
  status: string;
  description: string;
  fileUrl: string;
  submitTime: number;
}

/** 外部附件仅接受 http(s)；本地存储返回的是受保护下载路径，不能当作链接/代理地址 */
export function isExternalFile(fileUrl: string | null | undefined): boolean {
  return /^https?:\/\//i.test((fileUrl ?? '').trim());
}

/** 后端 AchievementApplyAdminVo -> 页面行 */
export function toAchievementApplication(vo: AchievementApplyAdminVo): AchievementApplication {
  return {
    id: vo.id,
    uid: vo.uid,
    username: vo.username ?? '',
    title: vo.title,
    status: vo.status ?? ACHIEVEMENT_STATUS.PENDING,
    description: vo.description ?? '',
    fileUrl: vo.fileUrl ?? '',
    submitTime: vo.submitTime ?? 0,
  };
}

export function useAchievementManage() {
  const message = useMessage();
  const dialog = useDialog();

  const loading = ref(false);
  const submitting = ref(false);
  const showRejectModal = ref(false);
  const rejectReason = ref('');
  const currentRejectId = ref<number | null>(null);

  const showDetailModal = ref(false);
  const detailRow = ref<AchievementApplication | null>(null);

  const filters = reactive({
    keyword: '',
    status: null as string | null,
    collegeId: null as number | null,
  });

  const list = ref<AchievementApplication[]>([]);

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
      void fetchList();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      void fetchList();
    },
  });

  const statusOptions = [
    { label: '待处理', value: ACHIEVEMENT_STATUS.PENDING },
    { label: '通过', value: ACHIEVEMENT_STATUS.APPROVED },
    { label: '打回', value: ACHIEVEMENT_STATUS.REJECTED },
  ];

  const collegeOptions = ref<Array<{ label: string; value: number }>>([]);

  const fetchColleges = async () => {
    try {
      const colleges = (await getColleges()) ?? [];
      collegeOptions.value = colleges.map((c) => ({ label: c.name, value: c.id }));
    } catch (err) {
      collegeOptions.value = [];
      message.error(err instanceof Error ? err.message : '加载学院列表失败');
    }
  };

  const fetchList = async () => {
    loading.value = true;
    try {
      const data = await getAdminAchievements(pagination.page, pagination.pageSize, {
        keyword: filters.keyword,
        status: filters.status ?? undefined,
        collegeId: filters.collegeId,
      });
      list.value = (data?.list ?? []).map(toAchievementApplication);
      pagination.itemCount = data?.total ?? 0;
    } catch (err) {
      list.value = [];
      pagination.itemCount = 0;
      message.error(err instanceof Error ? err.message : '加载成就申请失败');
    } finally {
      loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    void fetchList();
  };

  const resetFilters = () => {
    filters.keyword = '';
    filters.status = null;
    filters.collegeId = null;
    pagination.page = 1;
    void fetchList();
  };

  const openDetailModal = (row: AchievementApplication) => {
    detailRow.value = row;
    showDetailModal.value = true;
  };

  // 本地附件必须携带 Bearer 通过下载接口获取 Blob
  const handleDownloadFile = async (row: AchievementApplication) => {
    if (!row.fileUrl) {
      message.warning('该申请没有附件');
      return;
    }
    if (isExternalFile(row.fileUrl)) {
      window.open(row.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    submitting.value = true;
    try {
      const blob = await downloadAchievementApplyFile(row.id);
      saveBlob(blob, `achievement-${row.id}.bin`);
      message.success('附件已下载');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '附件下载失败');
    } finally {
      submitting.value = false;
    }
  };

  const handleApprove = (row: AchievementApplication) => {
    dialog.success({
      title: '通过确认',
      content: `确定要通过 "${row.username}" 的 "${row.title}" 申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        submitting.value = true;
        try {
          await approveAchievement(row.id);
          message.success('已通过');
          await fetchList();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '通过成就申请失败');
        } finally {
          submitting.value = false;
        }
      },
    });
  };

  const openRejectModal = (row: AchievementApplication) => {
    currentRejectId.value = row.id;
    rejectReason.value = '';
    showRejectModal.value = true;
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.value.trim()) {
      message.warning('请输入打回原因');
      return;
    }
    if (currentRejectId.value === null) return;
    submitting.value = true;
    try {
      await rejectAchievement(currentRejectId.value, rejectReason.value.trim());
      message.success('已打回');
      showRejectModal.value = false;
      await fetchList();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '打回成就申请失败');
    } finally {
      submitting.value = false;
    }
  };

  return {
    loading,
    submitting,
    list,
    filters,
    pagination,
    statusOptions,
    collegeOptions,
    showRejectModal,
    rejectReason,
    showDetailModal,
    detailRow,
    fetchColleges,
    fetchList,
    handleSearch,
    resetFilters,
    openDetailModal,
    handleDownloadFile,
    handleApprove,
    openRejectModal,
    handleRejectSubmit,
    isExternalFile,
  };
}
