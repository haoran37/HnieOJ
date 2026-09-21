import { reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  approveProfileChangeRequest,
  getAdminProfileChangeRequests,
  getClasses,
  getColleges,
  rejectProfileChangeRequest,
  PROFILE_CHANGE_FIELDS,
  type ProfileChangeSnapshot,
  type ProfileChangeStatus,
  type ProfileChangeVo,
} from '@/utils/api';

/**
 * 管理端资料变更审核（合并两套流程后的唯一入口，按申请 id 审批）。
 *
 * - 列表走真实分页/状态/关键字；行 key 为申请 id（同一用户可有历史申请）；
 * - 仅 PENDING 可审核；批准确认与驳回都必须填写原因（≤1000）；
 * - 审核期间锁定申请 id 快照，禁止切换到其它记录；
 * - 冲突/失败保留错误并重新读取真实状态，不假装成功、不弱化后端冲突。
 */
export function useUserChange() {
  const message = useMessage();

  const listLoading = ref(false);
  const saving = ref(false);
  const listError = ref<string | null>(null);
  const reviewError = ref<string | null>(null);

  const changes = ref<ProfileChangeVo[]>([]);
  const totalCount = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(15);

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
      changes.value = data?.list ?? [];
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

  const openReview = (row: ProfileChangeVo, mode: 'approve' | 'reject') => {
    if (saving.value) return;
    if (row.status !== 'PENDING') return;
    reviewMode.value = mode;
    reviewForm.id = row.id;
    reviewForm.uid = row.uid;
    reviewForm.reason = '';
    reviewError.value = null;
    lockedId.value = row.id;
    showReviewModal.value = true;
  };

  const openApprove = (row: ProfileChangeVo) => openReview(row, 'approve');
  const openReject = (row: ProfileChangeVo) => openReview(row, 'reject');

  const closeReview = () => {
    if (saving.value) return;
    showReviewModal.value = false;
    lockedId.value = null;
  };

  const handleReviewShowChange = (value: boolean) => {
    if (value) {
      showReviewModal.value = true;
      return;
    }
    closeReview();
  };

  const submitReview = async () => {
    if (saving.value) return;
    const id = lockedId.value;
    if (id == null) return;
    const mode = reviewMode.value;
    const reason = reviewForm.reason.trim();
    if (reason.length > 1000) {
      message.warning('原因长度不能超过 1000');
      return;
    }
    // 批准确认与驳回都要求填写原因
    if (!reason) {
      message.warning(mode === 'approve' ? '请填写通过原因' : '请填写驳回原因');
      return;
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
      await fetchChanges();
    } catch (err) {
      // 冲突/失败：保留错误并重新读取真实状态，不伪装成功
      reviewError.value = err instanceof Error ? err.message : '审核失败，请重试';
      message.error(reviewError.value);
      await fetchChanges();
    } finally {
      saving.value = false;
    }
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
    changedFields,
    changedSummary,
  };
}
