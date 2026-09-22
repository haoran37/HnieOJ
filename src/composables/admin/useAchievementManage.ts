import { computed, ref, reactive } from 'vue';
import { useMessage, useDialog, type DialogReactive } from 'naive-ui';
import {
  approveAchievement,
  batchApproveAchievements,
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

/** 批量通过的真实逐项结果：HTTP 200 也可能部分/全部失败 */
export interface AchievementBatchResult {
  successCount: number;
  failedCount: number;
  failures: { id: number; reason: string }[];
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
  // 审批等不可逆写操作的独立在途状态：与附件下载的 submitting 分离
  const mutating = ref(false);
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

  // ---- 批量通过：选择列（行 key 为字符串 id，提交前映射为数字 API ids） ----
  const selectedRowKeys = ref<string[]>([]);
  const selectedIds = computed(() => selectedRowKeys.value.map((key) => Number(key)));
  const batchResult = ref<AchievementBatchResult | null>(null);
  const batchError = ref<string | null>(null);
  // 选择/列表版本号：列表被搜索、重置、翻页、页大小、刷新或批量后重读即作废旧确认快照
  let selectionEpoch = 0;

  // ---- 审核确认占用与生命周期 ----
  // 单条通过 / 批量通过 / 打回同一时刻只允许一个确认，避免确认框叠加与先后重复提交
  const reviewConfirm = ref<'single' | 'batch' | 'reject' | null>(null);
  // 确认令牌：旧确认框迟到的 afterLeave/onClose 不得释放新确认框的占用
  let confirmToken = 0;

  /** 占用审核确认位；已有确认（含打回弹窗）时返回 null，拒绝叠加 */
  const beginConfirm = (kind: 'single' | 'batch' | 'reject'): number | null => {
    if (reviewConfirm.value !== null) return null;
    confirmToken += 1;
    reviewConfirm.value = kind;
    return confirmToken;
  };

  /** 释放审核确认位：仅发起时的令牌仍有效才释放，可重复调用 */
  const endConfirm = (token: number) => {
    if (token !== confirmToken) return;
    reviewConfirm.value = null;
  };

  /** 写操作在途时确认框不可关闭：禁用 Esc/遮罩，X/取消另由回调拒绝 */
  const setConfirmClosable = (dlg: DialogReactive, closable: boolean) => {
    dlg.closeOnEsc = closable;
    dlg.maskClosable = closable;
  };

  const clearSelection = () => {
    selectionEpoch += 1;
    selectedRowKeys.value = [];
  };

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

  // 请求序号：迟到的旧响应不得覆盖新筛选/新分页的结果
  let listSeq = 0;

  const fetchList = async () => {
    const current = ++listSeq;
    // 搜索/重置/翻页/页大小/刷新开始即清空旧选择并作废旧确认快照
    clearSelection();
    loading.value = true;
    try {
      const data = await getAdminAchievements(pagination.page, pagination.pageSize, {
        keyword: filters.keyword,
        status: filters.status ?? undefined,
        collegeId: filters.collegeId,
      });
      if (current !== listSeq) return;
      const rows = (data?.list ?? []).map(toAchievementApplication);
      // 审批后当前页可能被清空：回退上一页重读，不停留在空页
      if (rows.length === 0 && pagination.page > 1) {
        pagination.page -= 1;
        void fetchList();
        return;
      }
      list.value = rows;
      pagination.itemCount = data?.total ?? 0;
    } catch (err) {
      if (current !== listSeq) return;
      list.value = [];
      pagination.itemCount = 0;
      message.error(err instanceof Error ? err.message : '加载成就申请失败');
    } finally {
      if (current === listSeq) loading.value = false;
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
      const { blob, filename } = await downloadAchievementApplyFile(row.id);
      // 使用后端 Content-Disposition 的真实文件名，保留扩展名以便直接打开 PDF/图片
      saveBlob(blob, filename ?? `achievement-${row.id}.bin`);
      message.success('附件已下载');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '附件下载失败');
    } finally {
      submitting.value = false;
    }
  };

  const handleApprove = (row: AchievementApplication): boolean => {
    // 列表加载中或在途写操作不得再发起审批
    if (mutating.value || loading.value) return false;
    // 与批量通过/打回共享确认位：同一时刻只允许一个审核确认
    const token = beginConfirm('single');
    if (token === null) return false;
    // 快照本次确认的申请 id 与列表版本：弹窗期间刷新/翻页即作废本次确认
    const id = row.id;
    const epoch = selectionEpoch;
    // 本次确认是否已终结（提交过/取消/关闭/过时）：终结后回调不得再发请求
    let settled = false;
    const dlg = dialog.success({
      title: '通过确认',
      content: `确定要通过 "${row.username}" 的 "${row.title}" 申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      // 初始允许 Esc/遮罩关闭；写操作在途时再切换为不可关闭
      closeOnEsc: true,
      maskClosable: true,
      onNegativeClick: () => {
        if (mutating.value || settled) return false;
        settled = true;
        endConfirm(token);
        return true;
      },
      onClose: () => {
        if (mutating.value || settled) return false;
        settled = true;
        endConfirm(token);
        return true;
      },
      // 取消/X/遮罩/Esc 等所有实际关闭路径最终都会走到这里释放确认位
      onAfterLeave: () => {
        settled = true;
        endConfirm(token);
      },
      onPositiveClick: async () => {
        // 双击/已取消/已关闭/已被新确认取代/其它审批在途：不得重复发起请求
        if (settled || mutating.value) return false;
        // 弹窗期间列表被刷新/翻页：当次确认已过时，拒绝并关闭，提示重新选择
        if (epoch !== selectionEpoch) {
          message.warning('列表已刷新，请重新选择待处理的申请');
          settled = true;
          endConfirm(token);
          dlg.destroy();
          return false;
        }
        settled = true;
        // 使用与单条驳回/批量通过共享的 mutation 状态，
        // 不复用附件下载的 submitting，否则下载中确认审批会被静默拦截
        mutating.value = true;
        setConfirmClosable(dlg, false);
        try {
          await approveAchievement(id);
          message.success('已通过');
          await fetchList();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '通过成就申请失败');
        } finally {
          mutating.value = false;
          setConfirmClosable(dlg, true);
          endConfirm(token);
        }
        return true;
      },
    });
    return true;
  };

  // 打回弹窗占用的确认令牌
  let rejectToken: number | null = null;

  const releaseRejectConfirm = () => {
    if (rejectToken === null) return;
    endConfirm(rejectToken);
    rejectToken = null;
  };

  const openRejectModal = (row: AchievementApplication): boolean => {
    if (mutating.value || loading.value) return false;
    // 与单条通过/批量通过共享确认位：已有确认在待确认或进行中不得叠加
    const token = beginConfirm('reject');
    if (token === null) return false;
    rejectToken = token;
    currentRejectId.value = row.id;
    rejectReason.value = '';
    showRejectModal.value = true;
    return true;
  };

  /** 驳回弹窗关闭受控：在途写操作期间保持打开，不得借关闭绕过写锁 */
  const closeRejectModal = (): boolean => {
    if (mutating.value) return false;
    releaseRejectConfirm();
    showRejectModal.value = false;
    currentRejectId.value = null;
    return true;
  };

  const handleRejectShowChange = (value: boolean) => {
    if (value) {
      showRejectModal.value = true;
      return;
    }
    closeRejectModal();
  };

  const handleRejectSubmit = async (): Promise<boolean> => {
    // 双击/其它审批在途：不得重复发起请求
    if (mutating.value) return false;
    if (!rejectReason.value.trim()) {
      message.warning('请输入打回原因');
      return false;
    }
    // 提交前快照本次驳回的申请 id 与原因，之后修改弹窗内容不改变已发请求
    const id = currentRejectId.value;
    const reason = rejectReason.value.trim();
    if (id === null) return false;
    mutating.value = true;
    try {
      await rejectAchievement(id, reason);
      message.success('已打回');
      showRejectModal.value = false;
      currentRejectId.value = null;
      releaseRejectConfirm();
      await fetchList();
      return true;
    } catch (err) {
      message.error(err instanceof Error ? err.message : '打回成就申请失败');
      return false;
    } finally {
      mutating.value = false;
    }
  };

  /**
   * 选择列回调：只接受当前页真实存在且仍为 pending 的字符串 key，
   * 非法/不存在/已审核/重复的 key 一律过滤；列表加载或审批在途时不得改变选择。
   */
  const handleCheckedRowKeysChange = (keys: Array<string | number>) => {
    if (loading.value || mutating.value) return;
    const allowed = new Set(
      list.value
        .filter((row) => row.status === ACHIEVEMENT_STATUS.PENDING)
        .map((row) => String(row.id)),
    );
    const next: string[] = [];
    for (const key of keys ?? []) {
      const normalized = String(key);
      if (!allowed.has(normalized)) continue;
      if (next.includes(normalized)) continue;
      next.push(normalized);
    }
    selectedRowKeys.value = next;
  };

  const openBatchApprove = (): boolean => {
    // 列表加载中或在途写操作不得提交
    if (loading.value || mutating.value) return false;
    // 确认对象是当次已校验 id 快照：弹窗后勾选变化不会替换它
    const snapshot = [...selectedIds.value];
    if (snapshot.length === 0) {
      message.warning('请先选择待处理的成就申请');
      return false;
    }
    // 与单条通过/打回共享确认位：同一时刻只允许一个审核确认
    const token = beginConfirm('batch');
    if (token === null) return false;
    const epoch = selectionEpoch;
    // 本次确认是否已终结（提交过/取消/关闭/过时）：终结后回调不得再发请求
    let settled = false;
    const dlg = dialog.warning({
      title: '批量通过确认',
      content: `确定要通过选中的 ${snapshot.length} 条成就申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      // 初始允许 Esc/遮罩关闭；写操作在途时再切换为不可关闭
      closeOnEsc: true,
      maskClosable: true,
      onNegativeClick: () => {
        if (mutating.value || settled) return false;
        settled = true;
        endConfirm(token);
        return true;
      },
      onClose: () => {
        if (mutating.value || settled) return false;
        settled = true;
        endConfirm(token);
        return true;
      },
      // 取消/X/遮罩/Esc 等所有实际关闭路径最终都会走到这里释放确认位；
      // 迟到的旧框 afterLeave 由令牌识别，不会释放新确认框的占用
      onAfterLeave: () => {
        settled = true;
        endConfirm(token);
      },
      onPositiveClick: async () => {
        // 双击确认/已取消/已关闭/已消费/单条审批在途：不得重复发起请求，对话框保持打开
        if (settled || mutating.value) return false;
        // 弹窗期间列表被刷新/翻页：当次确认已过时，拒绝并关闭，不偷偷操作旧页
        if (epoch !== selectionEpoch) {
          message.warning('列表已刷新，请重新选择待处理的申请');
          settled = true;
          endConfirm(token);
          dlg.destroy();
          return false;
        }
        settled = true;
        mutating.value = true;
        // 在途禁止关闭：Esc/遮罩禁用，X/取消由上面的回调拒绝
        setConfirmClosable(dlg, false);
        // 新一次提交前清除旧结果，避免与本次混淆
        batchResult.value = null;
        batchError.value = null;
        try {
          // 只发送一次 {ids}，且只发送已校验快照
          const result = await batchApproveAchievements(snapshot);
          const successCount = result?.successCount ?? 0;
          const failedCount = result?.failedCount ?? 0;
          batchResult.value = {
            successCount,
            failedCount,
            failures: (result?.failures ?? []).map((failure) => ({
              id: Number(failure.id),
              reason: failure.reason,
            })),
          };
          // HTTP 200 也可能部分/全部失败：按真实计数提示，不冒充全部成功
          if (failedCount > 0) {
            message.warning(`批量通过完成：成功 ${successCount} 条，失败 ${failedCount} 条`);
          } else {
            message.success(`批量通过完成：成功 ${successCount} 条`);
          }
        } catch (err) {
          // 网络/HTTP 失败：显示真实错误并允许重试，不写成失败汇总、不显示成功
          batchError.value = err instanceof Error ? err.message : '批量通过失败';
          message.error(batchError.value);
        } finally {
          // 成功或失败都重新读取真实列表；刷新失败只影响列表错误，不篡改已知批量结果
          try {
            await fetchList();
          } finally {
            mutating.value = false;
            setConfirmClosable(dlg, true);
            endConfirm(token);
          }
        }
        return true;
      },
    });
    return true;
  };

  return {
    loading,
    submitting,
    mutating,
    list,
    filters,
    pagination,
    statusOptions,
    collegeOptions,
    showRejectModal,
    rejectReason,
    currentRejectId,
    showDetailModal,
    detailRow,
    selectedRowKeys,
    selectedIds,
    reviewConfirm,
    batchResult,
    batchError,
    fetchColleges,
    fetchList,
    handleSearch,
    resetFilters,
    openDetailModal,
    handleDownloadFile,
    handleApprove,
    openRejectModal,
    closeRejectModal,
    handleRejectShowChange,
    handleRejectSubmit,
    handleCheckedRowKeysChange,
    openBatchApprove,
    isExternalFile,
  };
}
