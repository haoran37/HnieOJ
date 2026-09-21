import { ref, reactive, h } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, useMessage, NPopconfirm, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { stringToColor, stringToTextColor } from '@/utils/colorUtils';
import {
  checkProblem,
  checkUser,
  createAdminContest,
  deleteAdminContest,
  getAdminContestDetail,
  getAdminContests,
  updateAdminContest,
  updateAdminContestStatus,
  type AdminContestDetailVo,
  type AdminContestListVo,
  type AdminContestProblemPayload,
} from '@/utils/api';

/** 题目编排行：内部 problemId 使用数字，展示编号为 A/B 字符串 */
export interface ContestProblemRow {
  problemId: number;
  problemCode: string;
  displayId: string;
  displayTitle: string;
  color: string | null;
}

/** 比赛限定账号行：后端只返回 uid/username */
export interface ContestAccountRow {
  uid: string;
  username: string;
}

/** 生成 A/B/.../Z/AA 形式的展示编号 */
export function buildDisplayIdByIndex(index: number): string {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

/** 比赛运行态（后端 ContestRuntimeStatusConstant）→ 简洁产品文案 */
export function runtimeStatusLabel(runtimeStatus: string | null): string {
  switch (runtimeStatus) {
    case 'Upcoming':
      return '未开始';
    case 'Running':
      return '进行中';
    case 'Ended':
      return '已结束';
    default:
      return runtimeStatus ?? '';
  }
}

// 比赛列表逻辑
export function useContestList() {
  const router = useRouter();
  const message = useMessage();

  const loading = ref(false);
  const tableData = ref<AdminContestListVo[]>([]);
  const searchKeyword = ref('');

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  // 局部请求序号：父筛选/翻页快速切换时旧响应不得覆盖新状态
  let fetchSeq = 0;

  const fetchContests = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const data = await getAdminContests({
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
      message.error(error instanceof Error ? error.message : '比赛列表加载失败');
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchContests();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchContests();
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    fetchContests();
  };

  const handleDelete = async (row: AdminContestListVo) => {
    try {
      await deleteAdminContest(row.id);
      message.success('比赛已删除');
      // 删除后当前页可能为空，回到第一页重新读取真实数据
      pagination.page = 1;
      await fetchContests();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除比赛失败');
    }
  };

  const handleToggleStatus = async (row: AdminContestListVo) => {
    const nextStatus = !row.status;
    try {
      await updateAdminContestStatus(row.id, nextStatus);
      message.success(nextStatus ? '比赛已启用' : '比赛已禁用');
      await fetchContests();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '状态更新失败');
    }
  };

  const columns: DataTableColumns<AdminContestListVo> = [
    {
      title: '编号',
      key: 'id',
      width: 80,
      render(row) {
        return h('span', { style: 'color: #000' }, String(row.id));
      },
    },
    {
      title: '名称',
      key: 'title',
      minWidth: 240,
      ellipsis: { tooltip: true },
      render(row) {
        return h(
          'a',
          {
            href: `/contest/${row.id}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
            onClick: (e: Event) => {
              e.preventDefault();
              window.open(`/contest/${row.id}`, '_blank');
            },
          },
          row.title,
        );
      },
    },
    {
      title: '开始时间-结束时间',
      key: 'time',
      width: 230,
      render(row) {
        return h('div', { style: 'display: flex; flex-direction: column; font-size: 13px;' }, [
          h('div', {}, `开始：${formatFullTime(row.startTime)}`),
          h('div', {}, `结束：${formatFullTime(row.endTime)}`),
        ]);
      },
    },
    {
      title: '标签',
      key: 'tags',
      width: 220,
      render(row) {
        const tags = [
          row.type ? { name: row.type } : null,
          row.auth ? { name: row.auth === 'Private' ? '私有' : '公开' } : null,
          ...(row.customTags ?? []).map((name) => ({ name })),
        ].filter(Boolean) as Array<{ name: string }>;
        return h(
          NSpace,
          { size: 4 },
          {
            default: () =>
              tags.map((tag) =>
                h(
                  NTag,
                  {
                    size: 'small',
                    bordered: false,
                    style: {
                      backgroundColor: stringToColor(tag.name),
                      color: stringToTextColor(tag.name),
                    },
                  },
                  { default: () => tag.name },
                ),
              ),
          },
        );
      },
    },
    { title: '题目数', key: 'problemCount', width: 90 },
    { title: '来源', key: 'source', width: 140, ellipsis: { tooltip: true } },
    { title: '创建者', key: 'author', width: 120 },
    {
      title: '状态',
      key: 'status',
      width: 150,
      render(row) {
        return h(NSpace, { size: 4, align: 'center' }, {
          default: () => [
            h(
              NTag,
              { type: row.status ? 'success' : 'error', size: 'small' },
              { default: () => (row.status ? '已启用' : '已禁用') },
            ),
            row.runtimeStatus
              ? h(NTag, { size: 'small', bordered: false }, { default: () => runtimeStatusLabel(row.runtimeStatus) })
              : null,
          ],
        });
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 210,
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
              { default: () => (row.status ? '禁用' : '启用') },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => router.push({ name: 'AdminContestEdit', params: { id: row.id } }),
              },
              { default: () => '编辑' },
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => handleDelete(row) },
              {
                trigger: () =>
                  h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => '删除' }),
                default: () => '确定删除该比赛吗？',
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
    fetchContests,
    handleDelete,
    handleToggleStatus,
  };
}

// 比赛表单逻辑（添加/编辑）
export function useContestForm() {
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
    // 后端 ContestTypeConstant 仅 ACM / OI
    type: 'ACM',
    // 后端 ContestAuthConstant 仅 Public / Private
    auth: 'Public',
    source: '',
    customTags: [] as string[],
    status: true,
    timeRange: null as [number, number] | null,
    description: '',
    rankShowName: 'username',
    openRank: true,
    sealRank: false,
    problems: [] as ContestProblemRow[],
    accountList: [] as ContestAccountRow[],
  });

  const typeOptions = [
    { label: 'ACM', value: 'ACM' },
    { label: 'OI', value: 'OI' },
  ];

  const authOptions = [
    { label: '公开', value: 'Public' },
    { label: '私有', value: 'Private' },
  ];

  const problemInput = ref('');
  const accountInput = ref('');
  // 防止重复并发添加，并配合记录代际作废旧响应
  const addingProblem = ref(false);
  const addingAccount = ref(false);

  const nextDisplayId = (): string => {
    const used = new Set(formValue.problems.map((p) => p.displayId.toUpperCase()));
    let index = 0;
    while (used.has(buildDisplayIdByIndex(index))) {
      index += 1;
    }
    return buildDisplayIdByIndex(index);
  };

  const addAccount = async (input: string) => {
    const query = input.trim();
    if (!query) return;
    if (addingAccount.value) return;
    addingAccount.value = true;
    const gen = detailSeq;
    const submitted = accountInput.value;
    loading.value = true;
    try {
      const result = await checkUser(query);
      if (gen !== detailSeq) return;
      if (!result?.exists || !result.uid) {
        message.warning('账号不存在，请确认后重试');
        return; // 保留输入
      }
      if (formValue.accountList.some((item) => item.uid === result.uid)) {
        message.warning('该账号已在列表中');
        return;
      }
      formValue.accountList.push({ uid: result.uid, username: result.username ?? result.uid });
      // 仅成功添加后清空输入；若用户已输入新内容则不覆盖
      if (accountInput.value === submitted) accountInput.value = '';
      message.success('账号已添加');
    } catch (error) {
      if (gen !== detailSeq) return;
      message.error(error instanceof Error ? error.message : '账号查验失败，请重试');
    } finally {
      if (gen === detailSeq) {
        loading.value = false;
        addingAccount.value = false;
      }
    }
  };

  const handleAddAccount = (input: string) => addAccount(input);

  const handleRemoveAccount = (uid: string) => {
    // 表格为本地分页，页内序号不等于完整数组下标，按 uid 过滤
    formValue.accountList = formValue.accountList.filter((item) => item.uid !== uid);
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
        color: null,
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
    row.displayId = String(value ?? '').toUpperCase();
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
      message.warning('请输入比赛名称');
      return;
    }
    if (!formValue.timeRange || formValue.timeRange.length !== 2) {
      message.warning('请选择比赛时间');
      return;
    }

    const problems: AdminContestProblemPayload[] = formValue.problems.map((item) => ({
      problemId: item.problemId,
      displayId: item.displayId || null,
      displayTitle: item.displayTitle || null,
      color: item.color,
    }));

    const payload = {
      title: formValue.title.trim(),
      type: formValue.type,
      auth: formValue.auth,
      source: formValue.source.trim() || null,
      customTags: formValue.customTags,
      status: formValue.status,
      startTime: formValue.timeRange[0],
      endTime: formValue.timeRange[1],
      description: formValue.description || null,
      rankShowName: formValue.rankShowName || null,
      openRank: formValue.openRank,
      sealRank: formValue.sealRank,
      problems,
      // 只有私有比赛才携带限定账号（后端也仅对 Private 生效）
      accountList:
        formValue.auth === 'Private' ? formValue.accountList.map((item) => item.uid) : [],
    };

    const submitGen = detailSeq;
    saving.value = true;
    try {
      if (isEdit) {
        await updateAdminContest(id as string | number, payload);
        if (submitGen !== detailSeq) return;
        message.success('比赛已保存');
      } else {
        await createAdminContest(payload);
        if (submitGen !== detailSeq) return;
        message.success('比赛已创建');
      }
      router.push({ name: 'AdminContestList' });
    } catch (error) {
      if (submitGen !== detailSeq) return;
      // 失败保留完整表单
      message.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      if (submitGen === detailSeq) saving.value = false;
    }
  };

  // 详情读取序号：路由复用/快速切换时旧响应不得覆盖新表单
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

  const applyDetail = (detail: AdminContestDetailVo, problems: ContestProblemRow[]) => {
    formValue.title = detail.title ?? '';
    formValue.type = detail.type ?? 'ACM';
    formValue.auth = detail.auth ?? 'Public';
    formValue.source = detail.source ?? '';
    formValue.customTags = (detail.customTags ?? []).slice();
    formValue.status = detail.status ?? false;
    formValue.description = detail.description ?? '';
    formValue.rankShowName = detail.rankShowName ?? 'username';
    formValue.openRank = detail.openRank ?? true;
    formValue.sealRank = detail.sealRank ?? false;
    formValue.timeRange =
      detail.timeRange && detail.timeRange.length === 2
        ? [detail.timeRange[0]!, detail.timeRange[1]!]
        : null;
    formValue.accountList = (detail.accountList ?? []).map((item) => ({
      uid: item.uid,
      username: item.username ?? item.uid,
    }));
    formValue.problems = problems;
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
    addingAccount.value = false;
  };

  // Load data for edit：本地组装后再应用，路由复用/快速切换时旧响应不得覆盖新表单
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
    addingAccount.value = false;
    try {
      const detail = await getAdminContestDetail(targetId);
      if (seq !== detailSeq) return;
      // 先在本地组装题目元数据，await 期间若记录已切换则整体丢弃
      const problems = await Promise.all(
        (detail.problems ?? []).map(async (problem) => {
          const meta = await resolveProblemMeta(problem.problemId);
          return {
            problemId: problem.problemId,
            problemCode: meta.problemCode,
            displayId: problem.displayId ?? '',
            displayTitle: problem.displayTitle ?? meta.displayTitle,
            color: problem.color ?? null,
          };
        }),
      );
      if (seq !== detailSeq) return;
      applyDetail(detail, problems);
      loadedDetailId.value = targetId;
    } catch (error) {
      if (seq !== detailSeq) return;
      detailError.value = error instanceof Error ? error.message : '比赛详情加载失败';
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
    accountInput,
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
    handleAddAccount,
    handleRemoveAccount,
    handleSubmit,
    loadData,
    reset,
  };
}
