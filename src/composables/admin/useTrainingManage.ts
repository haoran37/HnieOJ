import { ref, reactive, h } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, useMessage, NPopconfirm, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import {
  checkProblem,
  createAdminTraining,
  deleteAdminTraining,
  getAdminTrainingDetail,
  getAdminTrainings,
  updateAdminTraining,
  updateAdminTrainingStatus,
  type AdminTrainingListVo,
  type AdminTrainingProblemPayload,
} from '@/utils/api';

/** 题单编排行：displayId 为 Integer>=1（不能沿比赛的 A/B） */
export interface TrainingProblemRow {
  problemId: number;
  problemCode: string;
  displayId: number;
  displayTitle: string;
}

export function useTrainingManage() {
  const router = useRouter();
  const message = useMessage();

  const loading = ref(false);
  const tableData = ref<AdminTrainingListVo[]>([]);
  const searchKeyword = ref('');

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  let fetchSeq = 0;

  const fetchTrainings = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const data = await getAdminTrainings({
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: searchKeyword.value,
      });
      if (seq !== fetchSeq) return;
      tableData.value = data?.list ?? [];
      pagination.itemCount = data?.total ?? 0;
    } catch (error) {
      if (seq !== fetchSeq) return;
      tableData.value = [];
      pagination.itemCount = 0;
      message.error(error instanceof Error ? error.message : '题单列表加载失败');
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchTrainings();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchTrainings();
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    fetchTrainings();
  };

  const handleDelete = async (row: AdminTrainingListVo) => {
    try {
      await deleteAdminTraining(row.id);
      message.success('题单已删除');
      pagination.page = 1;
      await fetchTrainings();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除题单失败');
    }
  };

  const handleToggleStatus = async (row: AdminTrainingListVo) => {
    const nextStatus = !row.status;
    try {
      await updateAdminTrainingStatus(row.id, nextStatus);
      message.success(nextStatus ? '题单已启用' : '题单已关闭');
      await fetchTrainings();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '状态更新失败');
    }
  };

  const columns: DataTableColumns<AdminTrainingListVo> = [
    {
      title: '编号',
      key: 'id',
      width: 80,
      render(row) {
        return h('span', String(row.id));
      },
    },
    {
      title: '名称',
      key: 'title',
      minWidth: 200,
      ellipsis: { tooltip: true },
      render(row) {
        return h(
          'a',
          {
            href: `/training/${row.id}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
            onClick: (e: Event) => {
              e.preventDefault();
              router.push(`/training/${row.id}`);
            },
          },
          row.title,
        );
      },
    },
    { title: '类型', key: 'type', width: 100 },
    {
      title: '权限',
      key: 'auth',
      width: 90,
      render(row) {
        return row.auth === 'Private' ? '私有' : '公开';
      },
    },
    { title: '题目数', key: 'problemCount', width: 90 },
    { title: '排序', key: 'rank', width: 80 },
    { title: '创建者', key: 'author', width: 120 },
    {
      title: '创建时间',
      key: 'gmtCreate',
      width: 180,
      render: (row) => formatFullTime(row.gmtCreate),
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render(row) {
        return h(
          NTag,
          { type: row.status ? 'success' : 'error', size: 'small' },
          { default: () => (row.status ? '启用' : '关闭') },
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render(row) {
        return h(NSpace, {}, {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                secondary: true,
                type: row.status ? 'warning' : 'success',
                onClick: () => handleToggleStatus(row),
              },
              { default: () => (row.status ? '关闭' : '启用') },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => router.push({ name: 'AdminTrainingEdit', params: { id: row.id } }),
              },
              { default: () => '编辑' },
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => handleDelete(row) },
              {
                trigger: () =>
                  h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => '删除' }),
                default: () => '确定删除该题单吗？',
              },
            ),
          ],
        });
      },
    },
  ];

  return {
    loading,
    tableData,
    pagination,
    columns,
    searchKeyword,
    handleSearch,
    handlePageChange,
    handlePageSizeChange,
    fetchTrainings,
    handleDelete,
    handleToggleStatus,
  };
}

export function useTrainingForm() {
  const router = useRouter();
  const message = useMessage();
  const loading = ref(false);
  const saving = ref(false);
  // 编辑身份：仅当目标 id 的完整详情成功加载后才允许保存，防止把旧记录写入新 id
  const loadedDetailId = ref<string | null>(null);
  const detailLoading = ref(false);
  const detailError = ref<string | null>(null);

  const formValue = reactive({
    title: '',
    // 后端 TrainingTypeConstant 仅 Official / User
    type: 'Official',
    // 后端 TrainingAuthConstant 仅 Public / Private
    auth: 'Public',
    privatePwd: '',
    description: '',
    status: true,
    rank: 0,
    problems: [] as TrainingProblemRow[],
  });

  const typeOptions = [
    { label: '官方精选', value: 'Official' },
    { label: '用户分享', value: 'User' },
  ];

  const authOptions = [
    { label: '公开', value: 'Public' },
    { label: '私有', value: 'Private' },
  ];

  const problemInput = ref('');
  // 防止重复并发添加，并配合记录代际作废旧响应
  const addingProblem = ref(false);

  const nextDisplayId = (): number => {
    const used = new Set(formValue.problems.map((p) => p.displayId));
    let index = 1;
    while (used.has(index)) {
      index += 1;
    }
    return index;
  };

  const handleAddProblem = async () => {
    const raw = problemInput.value.trim();
    if (!raw) return;
    const problemId = Number(raw);
    if (!Number.isInteger(problemId) || problemId <= 0) {
      message.warning('请输入题目内部数字编号');
      return;
    }
    if (formValue.problems.some((item) => item.problemId === problemId)) {
      message.warning('题目已在列表中');
      return;
    }
    if (addingProblem.value) return; // 防止重复并发添加
    addingProblem.value = true;
    const gen = detailSeq;
    const submitted = problemInput.value;
    loading.value = true;
    try {
      const result = await checkProblem(problemId);
      if (gen !== detailSeq) return; // 记录已切换，丢弃旧响应
      if (!result?.exists) {
        message.warning('题目不存在，请确认编号');
        return; // 保留输入
      }
      if (formValue.problems.some((item) => item.problemId === problemId)) {
        message.warning('题目已在列表中');
        return;
      }
      formValue.problems.push({
        problemId,
        problemCode: result.problemCode ?? '',
        displayId: nextDisplayId(),
        displayTitle: result.title ?? String(problemId),
      });
      if (problemInput.value === submitted) problemInput.value = '';
      message.success('题目已添加');
    } catch (error) {
      if (gen !== detailSeq) return;
      message.error(error instanceof Error ? error.message : '题目查验失败，请重试');
    } finally {
      if (gen === detailSeq) {
        loading.value = false;
        addingProblem.value = false;
      }
    }
  };

  const handleRemoveProblem = (index: number) => {
    formValue.problems.splice(index, 1);
  };

  const handleUpdateDisplayId = (index: number, value: string | number | null) => {
    const row = formValue.problems[index];
    if (!row) return;
    const parsed = Number(value);
    row.displayId = Number.isInteger(parsed) && parsed > 0 ? parsed : row.displayId;
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const current = formValue.problems[index]!;
      const previous = formValue.problems[index - 1]!;
      formValue.problems[index] = previous;
      formValue.problems[index - 1] = current;
      // 后端按 displayId 排序，交换展示编号才能让新顺序持久化
      const displayId = current.displayId;
      current.displayId = previous.displayId;
      previous.displayId = displayId;
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < formValue.problems.length - 1) {
      const current = formValue.problems[index]!;
      const next = formValue.problems[index + 1]!;
      formValue.problems[index] = next;
      formValue.problems[index + 1] = current;
      // 后端按 displayId 排序，交换展示编号才能让新顺序持久化
      const displayId = current.displayId;
      current.displayId = next.displayId;
      next.displayId = displayId;
    }
  };

  const handleSubmit = async (isEdit: boolean, id?: string | number) => {
    if (saving.value) return;
    if (isEdit) {
      // 编辑必须锁定到已成功加载的完整详情：加载中/加载失败/路由复用都不得写入
      const requestedId = id === undefined || id === null || id === '' ? null : String(id);
      if (!requestedId || loadedDetailId.value === null || loadedDetailId.value !== requestedId) {
        message.error('数据尚未加载完成，请稍后重试');
        return;
      }
    }
    if (!formValue.title.trim()) {
      message.warning('请输入题单名称');
      return;
    }
    // 编辑时后端不回显原密码：留空表示保留原密码，只有新建私有题单必须显式设置
    if (!isEdit && formValue.auth === 'Private' && !formValue.privatePwd.trim()) {
      message.warning('私有题单必须设置访问密码');
      return;
    }

    const problems: AdminTrainingProblemPayload[] = formValue.problems.map((item) => ({
      problemId: item.problemId,
      displayId: item.displayId,
    }));

    const payload = {
      title: formValue.title.trim(),
      type: formValue.type,
      auth: formValue.auth,
      // 留空传 null，由后端按「保留原密码」处理，不把空串写成新密码
      privatePwd: formValue.auth === 'Private' ? formValue.privatePwd.trim() || null : null,
      description: formValue.description || null,
      status: formValue.status,
      rank: formValue.rank,
      problems,
    };

    const submitGen = detailSeq;
    saving.value = true;
    try {
      if (isEdit) {
        await updateAdminTraining(id as string | number, payload);
        if (submitGen !== detailSeq) return;
        message.success('题单已保存');
      } else {
        await createAdminTraining(payload);
        if (submitGen !== detailSeq) return;
        message.success('题单已创建');
      }
      router.push({ name: 'AdminTrainingList' });
    } catch (error) {
      if (submitGen !== detailSeq) return;
      // 失败保留完整表单
      message.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      if (submitGen === detailSeq) saving.value = false;
    }
  };

  let detailSeq = 0;

  const resolveProblemMeta = async (
    problemId: number,
  ): Promise<{ problemCode: string; displayTitle: string }> => {
    try {
      const info = await checkProblem(problemId);
      return { problemCode: info?.problemCode ?? '', displayTitle: info?.title ?? '' };
    } catch {
      return { problemCode: '', displayTitle: '' };
    }
  };

  // 编辑身份作废：路由切换/卸载时清空已加载标记并作废在途详情、保存与异步添加
  const reset = () => {
    detailSeq += 1;
    loadedDetailId.value = null;
    detailError.value = null;
    detailLoading.value = false;
    loading.value = false;
    saving.value = false;
    addingProblem.value = false;
  };

  // Load data for edit：必须走受保护完整详情，保留 privatePwd/description 与有序题目
  const loadData = async (id: string | number) => {
    const seq = ++detailSeq;
    const targetId = String(id);
    loadedDetailId.value = null;
    detailError.value = null;
    detailLoading.value = true;
    loading.value = true;
    // 新记录必须重置保存态：旧记录在途保存的 finally 依赖代际，不会清理新一代的 saving
    saving.value = false;
    addingProblem.value = false;
    try {
      const detail = await getAdminTrainingDetail(targetId);
      if (seq !== detailSeq) return;
      // 先在本地组装题目元数据，await 期间若记录已切换则整体丢弃
      const problems = await Promise.all(
        (detail.problems ?? []).map(async (problem, index) => {
          const meta = await resolveProblemMeta(problem.problemId);
          return {
            problemId: problem.problemId,
            problemCode: meta.problemCode,
            displayId: problem.displayId ?? index + 1,
            displayTitle: meta.displayTitle,
          };
        }),
      );
      if (seq !== detailSeq) return;
      formValue.title = detail.title ?? '';
      formValue.type = detail.type ?? 'Official';
      formValue.auth = detail.auth ?? 'Public';
      formValue.privatePwd = detail.privatePwd ?? '';
      formValue.description = detail.description ?? '';
      formValue.status = detail.status ?? false;
      formValue.rank = detail.rank ?? 0;
      formValue.problems = problems;
      loadedDetailId.value = targetId;
    } catch (error) {
      if (seq !== detailSeq) return;
      detailError.value = error instanceof Error ? error.message : '题单详情加载失败';
      message.error(detailError.value);
    } finally {
      if (seq === detailSeq) {
        loading.value = false;
        detailLoading.value = false;
      }
    }
  };

  return {
    formValue,
    typeOptions,
    authOptions,
    problemInput,
    loading,
    saving,
    loadedDetailId,
    detailLoading,
    detailError,
    handleAddProblem,
    handleRemoveProblem,
    handleUpdateDisplayId,
    handleMoveUp,
    handleMoveDown,
    handleSubmit,
    loadData,
    reset,
  };
}
