import { reactive, ref } from 'vue';
import { useDialog, useMessage, type DialogReactive } from 'naive-ui';
import {
  approveProfileChangeRequest,
  batchApproveProfileChangeRequests,
  getAdminProfileChangeRequests,
  getClasses,
  getColleges,
  rejectProfileChangeRequest,
  PROFILE_CHANGE_FIELDS,
  type ProfileChangeSnapshot,
  type ProfileChangeStatus,
  type ProfileChangeVo,
} from '@/utils/api';

/** 批量通过的真实逐项结果：HTTP 200 也可能部分/全部失败（failures.id 为字符串） */
export interface ProfileChangeBatchResult {
  successCount: number;
  failedCount: number;
  failures: { id: string; reason: string }[];
}

/**
 * 管理端资料变更审核（项目内唯一的资料变更入口，按申请 id 审批）。
 *
 * - 列表走真实分页/状态/关键字；行 key 为申请 id（同一用户可有历史申请）；
 * - 仅 PENDING 可审核；批准确认与驳回都必须填写原因（≤1000）；
 * - 审核期间锁定申请 id 快照，禁止切换到其它记录；
 * - 冲突/失败保留错误并重新读取真实状态，不假装成功、不弱化后端冲突。
 */
export function useUserChange() {
  const message = useMessage();
  const dialog = useDialog();

  const listLoading = ref(false);
  const saving = ref(false);
  const listError = ref<string | null>(null);
  const reviewError = ref<string | null>(null);

  const changes = ref<ProfileChangeVo[]>([]);
  const totalCount = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(15);

  // ---- 批量通过：选择列（行 key 为数字申请 id，直接作为 API ids） ----
  const selectedIds = ref<number[]>([]);
  const batchResult = ref<ProfileChangeBatchResult | null>(null);
  const batchError = ref<string | null>(null);
  // 选择/列表版本号：搜索、重置、翻页、页大小、刷新或批量后重读即作废旧确认快照
  let selectionEpoch = 0;

  // ---- 审核确认占用与生命周期 ----
  // 单条审核弹窗 / 批量通过同一时刻只允许一个确认，避免确认叠加与先后重复提交
  const reviewConfirm = ref<'single' | 'batch' | null>(null);
  // 确认令牌：旧确认框迟到的 afterLeave/onClose 不得释放新确认框的占用
  let confirmToken = 0;

  /** 占用审核确认位；已有确认（含单条审核弹窗）时返回 null，拒绝叠加 */
  const beginConfirm = (kind: 'single' | 'batch'): number | null => {
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
    selectedIds.value = [];
  };

  const searchForm = reactive({
    keyword: '',
    status: null as ProfileChangeStatus | null,
  });

  // 学院/班级名称解析（真实基础数据，仅用于把人看得懂的标签补上）
  const collegeMap = ref<Record<number, string>>({});
  const classMap = ref<Record<number, string>>({});
  let collegesLoaded = false;

  const loadCollegesOnce = async () => {
    if (collegesLoaded) return;
    collegesLoaded = true;
    try {
      const colleges = (await getColleges()) ?? [];
      const map: Record<number, string> = {};
      for (const item of Array.isArray(colleges) ? colleges : []) map[item.id] = item.name;
      collegeMap.value = map;
    } catch {
      // 名称解析失败不影响审核主流程，界面回退显示学院 id
      collegesLoaded = false;
    }
  };

  const loadClassNames = async (rows: ProfileChangeVo[]) => {
    const pairs = new Map<string, { collegeId: number; grade: string }>();
    for (const row of rows) {
      for (const identity of [row.original, row.proposed]) {
        if (identity && identity.collegeId != null && identity.grade) {
          const key = `${identity.collegeId}|${identity.grade}`;
          pairs.set(key, { collegeId: identity.collegeId, grade: identity.grade });
        }
      }
    }
    const entries = [...pairs.values()];
    if (entries.length === 0) return;
    const results = await Promise.allSettled(
      entries.map((entry) => getClasses(entry.collegeId, entry.grade)),
    );
    const map = { ...classMap.value };
    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      for (const item of Array.isArray(result.value) ? result.value : []) map[item.id] = item.name;
    });
    classMap.value = map;
  };

  let listSeq = 0;

  const fetchChanges = async () => {
    const seq = ++listSeq;
    // 搜索/重置/翻页/页大小/刷新开始即清空旧选择并作废旧确认快照
    clearSelection();
    listLoading.value = true;
    listError.value = null;
    try {
      const data = await getAdminProfileChangeRequests({
        page: currentPage.value,
        pageSize: pageSize.value,
        status: searchForm.status,
        keyword: searchForm.keyword,
      });
      if (seq !== listSeq) return;
      const rows = data?.list ?? [];
      // 批量通过后当前页可能被清空：回退上一页重读，不停留在空页
      if (rows.length === 0 && currentPage.value > 1) {
        currentPage.value -= 1;
        void fetchChanges();
        return;
      }
      changes.value = rows;
      totalCount.value = data?.total ?? 0;
      void loadCollegesOnce();
      void loadClassNames(changes.value);
    } catch (err) {
      if (seq !== listSeq) return;
      changes.value = [];
      totalCount.value = 0;
      listError.value = err instanceof Error ? err.message : '变更申请加载失败';
    } finally {
      if (seq === listSeq) listLoading.value = false;
    }
  };

  const handleSearch = () => {
    currentPage.value = 1;
    void fetchChanges();
  };

  const handleReset = () => {
    searchForm.keyword = '';
    searchForm.status = null;
    currentPage.value = 1;
    void fetchChanges();
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
    void fetchChanges();
  };

  const handlePageSizeChange = (size: number) => {
    pageSize.value = size;
    currentPage.value = 1;
    void fetchChanges();
  };

  // 审核弹窗
  const showReviewModal = ref(false);
  const reviewMode = ref<'approve' | 'reject'>('approve');
  const reviewForm = reactive({
    id: 0,
    uid: '',
    reason: '',
  });
  // 审核期间锁定申请 id，禁止切换到其它记录
  const lockedId = ref<number | null>(null);
  // 单条审核弹窗占用的确认令牌
  let reviewToken: number | null = null;

  const openReview = (row: ProfileChangeVo, mode: 'approve' | 'reject'): boolean => {
    // 列表加载中或在途写操作（含批量）不得再打开审核弹窗
    if (saving.value || listLoading.value) return false;
    if (row.status !== 'PENDING') return false;
    // 与批量通过共享确认位：已有确认（含批量确认框）在待确认或进行中不得叠加
    const token = beginConfirm('single');
    if (token === null) return false;
    reviewToken = token;
    reviewMode.value = mode;
    reviewForm.id = row.id;
    reviewForm.uid = row.uid;
    reviewForm.reason = '';
    reviewError.value = null;
    lockedId.value = row.id;
    showReviewModal.value = true;
    return true;
  };

  const openApprove = (row: ProfileChangeVo) => openReview(row, 'approve');
  const openReject = (row: ProfileChangeVo) => openReview(row, 'reject');

  const closeReview = (): boolean => {
    if (saving.value) return false;
    if (reviewToken !== null) {
      endConfirm(reviewToken);
      reviewToken = null;
    }
    showReviewModal.value = false;
    lockedId.value = null;
    return true;
  };

  const handleReviewShowChange = (value: boolean) => {
    if (value) {
      showReviewModal.value = true;
      return;
    }
    closeReview();
  };

  const submitReview = async (): Promise<boolean> => {
    // 保存中/列表加载中不得提交
    if (saving.value || listLoading.value) return false;
    // 已取消/已关闭的审核弹窗不得再提交
    if (reviewToken === null || reviewConfirm.value !== 'single') return false;
    const id = lockedId.value;
    if (id == null) return false;
    const mode = reviewMode.value;
    const reason = reviewForm.reason.trim();
    if (reason.length > 1000) {
      message.warning('原因长度不能超过 1000');
      return false;
    }
    // 批准确认与驳回都要求填写原因
    if (!reason) {
      message.warning(mode === 'approve' ? '请填写通过原因' : '请填写驳回原因');
      return false;
    }
    saving.value = true;
    reviewError.value = null;
    try {
      if (mode === 'approve') {
        await approveProfileChangeRequest(id, reason);
        message.success('已通过');
      } else {
        await rejectProfileChangeRequest(id, reason);
        message.success('已驳回');
      }
      showReviewModal.value = false;
      lockedId.value = null;
      if (reviewToken !== null) {
        endConfirm(reviewToken);
        reviewToken = null;
      }
      await fetchChanges();
      return true;
    } catch (err) {
      // 冲突/失败：保留错误并重新读取真实状态，不伪装成功
      reviewError.value = err instanceof Error ? err.message : '审核失败，请重试';
      message.error(reviewError.value);
      await fetchChanges();
      return false;
    } finally {
      saving.value = false;
    }
  };

  /**
   * 选择列回调：行 key 为数字申请 id；只接受当前页真实存在且仍为 PENDING 的行，
   * 非法/不存在/已审核/重复 key 一律过滤；列表加载或写操作在途时不得改变选择。
   */
  const handleCheckedRowKeysChange = (keys: Array<string | number>) => {
    if (listLoading.value || saving.value) return;
    const allowed = new Set(
      changes.value.filter((row) => row.status === 'PENDING').map((row) => row.id),
    );
    const next: number[] = [];
    for (const key of keys ?? []) {
      const id = typeof key === 'number' ? key : Number(key);
      if (!Number.isInteger(id) || id <= 0) continue;
      if (!allowed.has(id)) continue;
      if (next.includes(id)) continue;
      next.push(id);
    }
    selectedIds.value = next;
  };

  const openBatchApprove = (): boolean => {
    // 列表加载中或在途写操作不得提交
    if (listLoading.value || saving.value) return false;
    // 确认对象是当次已校验 id 快照：弹窗后勾选变化不会替换它
    const snapshot = [...selectedIds.value];
    if (snapshot.length === 0) {
      message.warning('请先选择待通过的变更申请');
      return false;
    }
    // 与单条审核弹窗共享确认位：同一时刻只允许一个审核确认
    const token = beginConfirm('batch');
    if (token === null) return false;
    const epoch = selectionEpoch;
    // 本次确认是否已终结（提交过/取消/关闭/过时）：终结后回调不得再发请求
    let settled = false;
    const dlg = dialog.warning({
      title: '批量通过确认',
      content: `确定要通过选中的 ${snapshot.length} 条资料变更申请吗？`,
      positiveText: '确定',
      negativeText: '取消',
      // 初始允许 Esc/遮罩关闭；写操作在途时再切换为不可关闭
      closeOnEsc: true,
      maskClosable: true,
      onNegativeClick: () => {
        if (saving.value || settled) return false;
        settled = true;
        endConfirm(token);
        return true;
      },
      onClose: () => {
        if (saving.value || settled) return false;
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
        // 双击确认/已取消/已关闭/已消费/单条审核在途：不得重复发起请求，对话框保持打开
        if (settled || saving.value) return false;
        // 弹窗期间列表被刷新/翻页：当次确认已过时，拒绝并关闭，不偷偷操作旧页
        if (epoch !== selectionEpoch) {
          message.warning('列表已刷新，请重新选择待通过的申请');
          settled = true;
          endConfirm(token);
          dlg.destroy();
          return false;
        }
        settled = true;
        saving.value = true;
        // 在途禁止关闭：Esc/遮罩禁用，X/取消由上面的回调拒绝
        setConfirmClosable(dlg, false);
        // 新一次提交前清除旧结果，避免与本次混淆
        batchResult.value = null;
        batchError.value = null;
        try {
          // 只发送一次 {ids}，且只发送已校验快照
          const result = await batchApproveProfileChangeRequests(snapshot);
          const successCount = result?.successCount ?? 0;
          const failedCount = result?.failedCount ?? 0;
          batchResult.value = {
            successCount,
            failedCount,
            failures: (result?.failures ?? []).map((failure) => ({
              id: String(failure.id),
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
            await fetchChanges();
          } finally {
            saving.value = false;
            setConfirmClosable(dlg, true);
            endConfirm(token);
          }
        }
        return true;
      },
    });
    return true;
  };

  const collegeLabel = (id: number | null | undefined): string => {
    if (id == null) return '未填写';
    return collegeMap.value[id] ?? `学院 #${id}`;
  };

  const classLabel = (id: number | null | undefined): string => {
    if (id == null) return '未填写';
    return classMap.value[id] ?? `班级 #${id}`;
  };

  /**
   * 本次申请真正发生变化的字段（口径与后端 ProfileChangeField.changedFields 一致）：
   * 只展示 original 与 proposed 不同的字段，避免把整份快照 12 个字段全铺出来噪声过大。
   */
  const changedFields = (
    original: ProfileChangeSnapshot | null,
    proposed: ProfileChangeSnapshot | null,
  ): { label: string; from: string; to: string }[] => {
    if (!proposed) return [];
    const rows: { label: string; from: string; to: string }[] = [];
    for (const field of PROFILE_CHANGE_FIELDS) {
      const before = original ? original[field.key] : null;
      const after = proposed[field.key];
      if (before === after) continue;
      rows.push({ label: field.label, from: displayValue(field.key, before), to: displayValue(field.key, after) });
    }
    return rows;
  };

  const displayValue = (key: keyof ProfileChangeSnapshot, value: string | number | null): string => {
    if (value === null || value === undefined || value === '') return '未填写';
    if (key === 'collegeId') return collegeLabel(Number(value));
    if (key === 'classId') return classLabel(Number(value));
    return String(value);
  };

  /** 单行摘要，用于表格里的「变更内容」列 */
  const changedSummary = (row: ProfileChangeVo): string => {
    const rows = changedFields(row.original, row.proposed);
    if (rows.length === 0) return '无字段变更';
    return rows.map((item) => `${item.label}：${item.from} → ${item.to}`).join('；');
  };

  return {
    listLoading,
    saving,
    listError,
    reviewError,
    changes,
    totalCount,
    currentPage,
    pageSize,
    searchForm,
    showReviewModal,
    reviewMode,
    reviewForm,
    selectedIds,
    reviewConfirm,
    batchResult,
    batchError,
    fetchChanges,
    handleSearch,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
    openApprove,
    openReject,
    closeReview,
    handleReviewShowChange,
    submitReview,
    handleCheckedRowKeysChange,
    openBatchApprove,
    changedFields,
    changedSummary,
  };
}
