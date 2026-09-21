import { computed, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  createAdminNotice,
  deleteAdminNotice,
  getAdminNoticeDetail,
  getAdminNotices,
  getClasses,
  getColleges,
  getGrades,
  publishAdminNotice,
  searchUsers,
  updateAdminNotice,
  type NoticeListVo,
  type NoticeStatus,
  type NoticeTargetType,
} from '@/utils/api';

interface SelectOption<T> {
  label: string;
  value: T;
}

/**
 * 管理通知：草稿 CRUD + 发布。
 *
 * - 列表/详情/保存/发布使用独立状态与请求序号，旧筛选/页/记录响应会被作废；
 * - 创建与保存都只写草稿，发布前必须确认收件目标，发布成功后重新读取列表；
 * - 收件目标只来自真实用户查询 / 学院-年级-班级查询，不手造名单、不默认全校；
 * - 已发布通知只读，不可编辑正文/目标；删除只删管理记录，不撤回已投递消息。
 */
export function useNotice() {
  const message = useMessage();

  const listLoading = ref(false);
  const detailLoading = ref(false);
  const saving = ref(false);
  const publishing = ref(false);
  const deleting = ref(false);
  const listError = ref<string | null>(null);

  const notices = ref<NoticeListVo[]>([]);
  const totalCount = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(10);

  const searchForm = reactive({
    keyword: '',
    status: null as NoticeStatus | null,
  });

  const showModal = ref(false);
  // create=新建草稿；edit=编辑草稿；view=已发布只读详情
  const modalMode = ref<'create' | 'edit' | 'view'>('create');

  const form = reactive({
    id: 0,
    title: '',
    content: '',
    targetType: 'USERS' as NoticeTargetType,
    targetIds: [] as string[],
  });

  // 列表页分页序号：旧筛选/页响应直接丢弃
  let listSeq = 0;

  const fetchNotices = async () => {
    const seq = ++listSeq;
    listLoading.value = true;
    listError.value = null;
    try {
      const data = await getAdminNotices({
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchForm.keyword,
        status: searchForm.status,
      });
      if (seq !== listSeq) return;
      notices.value = data?.list ?? [];
      totalCount.value = data?.total ?? 0;
    } catch (err) {
      if (seq !== listSeq) return;
      notices.value = [];
      totalCount.value = 0;
      listError.value = err instanceof Error ? err.message : '通知列表加载失败';
    } finally {
      if (seq === listSeq) listLoading.value = false;
    }
  };

  const handleSearch = () => {
    currentPage.value = 1;
    void fetchNotices();
  };

  const handleReset = () => {
    searchForm.keyword = '';
    searchForm.status = null;
    currentPage.value = 1;
    void fetchNotices();
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
    void fetchNotices();
  };

  const handlePageSizeChange = (size: number) => {
    pageSize.value = size;
    currentPage.value = 1;
    void fetchNotices();
  };

  // ---------------- 详情读取（作废旧响应） ----------------
  let detailSeq = 0;

  const applyDetail = (detail: Awaited<ReturnType<typeof getAdminNoticeDetail>>) => {
    form.id = detail.id;
    form.title = detail.title ?? '';
    form.content = detail.content ?? '';
    form.targetType = (detail.targetType as NoticeTargetType) ?? 'USERS';
    form.targetIds = (detail.targetIds ?? []).map(String);
  };

  const resetForm = () => {
    form.id = 0;
    form.title = '';
    form.content = '';
    form.targetType = 'USERS';
    form.targetIds = [];
    resetRecipientPickers();
  };

  const openCreateModal = () => {
    if (saving.value || publishing.value) return;
    ++detailSeq;
    resetForm();
    modalMode.value = 'create';
    showModal.value = true;
  };

  const openDetailModal = async (row: NoticeListVo, readonly = false) => {
    if (saving.value || publishing.value) return;
    const seq = ++detailSeq;
    detailLoading.value = true;
    // 详情返回前不开弹窗并先清空表单：避免加载间隙保存把上一条通知 PUT 回后端
    showModal.value = false;
    resetForm();
    try {
      const detail = await getAdminNoticeDetail(row.id);
      if (seq !== detailSeq) return;
      applyDetail(detail);
      modalMode.value = readonly || detail.status === 'PUBLISHED' ? 'view' : 'edit';
      showModal.value = true;
    } catch (err) {
      if (seq !== detailSeq) return;
      showModal.value = false;
      message.error(err instanceof Error ? err.message : '无法读取通知详情，请稍后重试');
    } finally {
      if (seq === detailSeq) detailLoading.value = false;
    }
  };

  const closeModal = () => {
    // 保存/发布期间禁止关闭，避免在途结果写入或关闭新表单
    if (saving.value || publishing.value) return;
    ++detailSeq;
    showModal.value = false;
  };

  const handleModalShowChange = (value: boolean) => {
    if (value) {
      showModal.value = true;
      return;
    }
    closeModal();
  };

  // ---------------- 收件目标选择 ----------------
  const collegeOptions = ref<SelectOption<number>[]>([]);
  const gradeOptions = ref<SelectOption<string>[]>([]);
  const classOptions = ref<SelectOption<number>[]>([]);
  const selectedCollegeId = ref<number | null>(null);
  const selectedGrade = ref<string | null>(null);
  let gradeSeq = 0;
  let classSeq = 0;

  const recipientUserOptions = ref<SelectOption<string>[]>([]);
  const userSearching = ref(false);
  let userSeq = 0;

  const resetRecipientPickers = () => {
    selectedCollegeId.value = null;
    selectedGrade.value = null;
    gradeOptions.value = [];
    classOptions.value = [];
    // 作废在途的年级/班级/用户查询
    ++gradeSeq;
    ++classSeq;
    ++userSeq;
  };

  const handleUserSearch = async (query: string) => {
    const seq = ++userSeq;
    userSearching.value = true;
    try {
      const data = await searchUsers(query, 1, 20);
      if (seq !== userSeq) return;
      recipientUserOptions.value = (data?.list ?? []).map((item) => ({
        label: `${item.username || item.uid}（${item.uid}）`,
        value: item.uid,
      }));
    } catch (err) {
      if (seq !== userSeq) return;
      recipientUserOptions.value = [];
      message.error(err instanceof Error ? err.message : '用户查询失败');
    } finally {
      if (seq === userSeq) userSearching.value = false;
    }
  };

  const loadColleges = async () => {
    if (collegeOptions.value.length > 0) return;
    try {
      const colleges = await getColleges();
      collegeOptions.value = (Array.isArray(colleges) ? colleges : []).map((item) => ({
        label: item.name,
        value: item.id,
      }));
    } catch (err) {
      message.error(err instanceof Error ? err.message : '学院加载失败');
    }
  };

  const handleCollegeChange = async (value: number | null) => {
    selectedCollegeId.value = value;
    selectedGrade.value = null;
    gradeOptions.value = [];
    classOptions.value = [];
    if (form.targetType === 'CLASSES') form.targetIds = [];
    ++classSeq;
    const seq = ++gradeSeq;
    if (!value) return;
    try {
      const grades = await getGrades(value);
      const options = (Array.isArray(grades) ? grades : []).map((item) => ({
        label: item.grade,
        value: item.grade,
      }));
      if (seq !== gradeSeq) return;
      gradeOptions.value = options;
    } catch (err) {
      if (seq !== gradeSeq) return;
      gradeOptions.value = [];
      message.error(err instanceof Error ? err.message : '年级加载失败');
    }
  };

  const handleGradeChange = async (value: string | null) => {
    selectedGrade.value = value;
    classOptions.value = [];
    if (form.targetType === 'CLASSES') form.targetIds = [];
    const seq = ++classSeq;
    if (!value || !selectedCollegeId.value) return;
    try {
      const classes = await getClasses(selectedCollegeId.value, value);
      const options = (Array.isArray(classes) ? classes : []).map((item) => ({
        label: item.name,
        value: item.id,
      }));
      if (seq !== classSeq) return;
      classOptions.value = options;
    } catch (err) {
      if (seq !== classSeq) return;
      classOptions.value = [];
      message.error(err instanceof Error ? err.message : '班级加载失败');
    }
  };

  // USERS：远程多选直接绑定 targetIds；已保存但未在选项中的 uid 显示原值，可删除
  const userPickerOptions = computed<SelectOption<string>[]>(() => {
    const options = recipientUserOptions.value.slice();
    const known = new Set(options.map((item) => String(item.value)));
    for (const id of form.targetIds) {
      if (!known.has(id)) options.push({ label: id, value: id });
    }
    return options;
  });

  // CLASSES：多选班级，选项来自真实班级查询；已保存但未解析到名称的显示班级 id
  const classPickerOptions = computed<SelectOption<string>[]>(() => {
    const options = classOptions.value.map((item) => ({
      label: item.label,
      value: String(item.value),
    }));
    const known = new Set(options.map((item) => item.value));
    for (const id of form.targetIds) {
      if (!known.has(id)) options.push({ label: `班级 #${id}`, value: id });
    }
    return options;
  });

  const handleTargetTypeChange = (value: NoticeTargetType) => {
    form.targetType = value;
    // 切换收件方式必须清空旧目标，避免把用户 uid 当成班级 id 提交
    form.targetIds = [];
    resetRecipientPickers();
  };

  // ---------------- 保存 / 发布 / 删除 ----------------
  const buildPayload = () => {
    const targetIds = [...new Set(form.targetIds.map((id) => String(id).trim()).filter(Boolean))];
    return {
      title: form.title.trim(),
      content: form.content,
      targetType: form.targetType,
      targetIds,
    };
  };

  const validateForm = (): string | null => {
    if (!form.title.trim()) return '请输入通知标题';
    if (form.title.trim().length > 255) return '标题长度不能超过 255';
    if (!form.content.trim()) return '请输入通知正文';
    if (form.content.length > 20000) return '正文长度不能超过 20000';
    const ids = [...new Set(form.targetIds.map((id) => String(id).trim()).filter(Boolean))];
    if (ids.length === 0) return '请选择收件目标';
    if (ids.length > 1000) return '收件目标数量不能超过 1000';
    return null;
  };

  const handleSubmit = async () => {
    if (saving.value || publishing.value) return;
    if (modalMode.value === 'view') return;
    const invalid = validateForm();
    if (invalid) {
      message.warning(invalid);
      return;
    }
    const mode = modalMode.value;
    const id = form.id;
    const payload = buildPayload();
    saving.value = true;
    try {
      if (mode === 'create') {
        await createAdminNotice(payload);
        message.success('草稿已创建');
      } else {
        await updateAdminNotice(id, payload);
        message.success('草稿已保存');
      }
      showModal.value = false;
      await fetchNotices();
    } catch (err) {
      // 失败保留表单输入，用户可修正后重试
      message.error(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      saving.value = false;
    }
  };

  // 发布确认：先读取详情（含已保存目标），确认后不可撤回
  const showPublishModal = ref(false);
  const publishTarget = ref<NoticeListVo | null>(null);
  const publishDetail = ref<Awaited<ReturnType<typeof getAdminNoticeDetail>> | null>(null);
  let publishSeq = 0;

  const openPublishConfirm = async (row: NoticeListVo) => {
    if (publishing.value) return;
    const seq = ++publishSeq;
    publishTarget.value = row;
    publishDetail.value = null;
    showPublishModal.value = true;
    try {
      const detail = await getAdminNoticeDetail(row.id);
      if (seq !== publishSeq) return;
      publishDetail.value = detail;
    } catch (err) {
      if (seq !== publishSeq) return;
      showPublishModal.value = false;
      message.error(err instanceof Error ? err.message : '无法读取收件目标，请稍后重试');
    }
  };

  const closePublishModal = () => {
    if (publishing.value) return;
    ++publishSeq;
    showPublishModal.value = false;
  };

  const handlePublishShowChange = (value: boolean) => {
    if (value) {
      showPublishModal.value = true;
      return;
    }
    closePublishModal();
  };

  const confirmPublish = async () => {
    if (publishing.value) return;
    const row = publishTarget.value;
    if (!row) return;
    publishing.value = true;
    try {
      await publishAdminNotice(row.id);
      message.success('发布成功');
      showPublishModal.value = false;
      await fetchNotices();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发布失败，请重试');
    } finally {
      publishing.value = false;
    }
  };

  const handleDelete = async (row: NoticeListVo) => {
    // 删除中禁止再次点击，避免并发 DELETE（管理记录删除只删本记录，不撤回已投递消息）
    if (saving.value || publishing.value || deleting.value) return;
    deleting.value = true;
    try {
      await deleteAdminNotice(row.id);
      message.success('已删除管理记录（不撤回已投递消息）');
      // 删除最后一条时回退页码，避免停留在空页
      if (notices.value.length === 1 && currentPage.value > 1) {
        currentPage.value -= 1;
      }
      await fetchNotices();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      deleting.value = false;
    }
  };

  return {
    listLoading,
    detailLoading,
    saving,
    publishing,
    deleting,
    listError,
    notices,
    totalCount,
    currentPage,
    pageSize,
    searchForm,
    showModal,
    modalMode,
    form,
    fetchNotices,
    handleSearch,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
    openCreateModal,
    openDetailModal,
    closeModal,
    handleModalShowChange,
    // 收件目标
    collegeOptions,
    gradeOptions,
    classOptions,
    selectedCollegeId,
    selectedGrade,
    recipientUserOptions,
    userSearching,
    userPickerOptions,
    classPickerOptions,
    loadColleges,
    handleUserSearch,
    handleCollegeChange,
    handleGradeChange,
    handleTargetTypeChange,
    // 保存 / 发布 / 删除
    handleSubmit,
    showPublishModal,
    publishDetail,
    openPublishConfirm,
    closePublishModal,
    handlePublishShowChange,
    confirmPublish,
    handleDelete,
  };
}
