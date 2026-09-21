import { ref, reactive, h, computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, useMessage, NPopconfirm, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { buildDisplayIdByIndex } from '@/utils/displayId';
import {
  checkProblem,
  createAdminHomework,
  deleteAdminHomework,
  getAdminHomeworkDetail,
  getAdminHomeworks,
  getClasses,
  getColleges,
  getGrades,
  updateAdminHomework,
  updateAdminHomeworkStatus,
  type AdminHomeworkListVo,
  type AdminHomeworkProblemPayload,
} from '@/utils/api';

// --- 类型定义 ---
export interface OptionNode {
  label: string;
  value: number;
}

/** 作业编排行：displayId 为 A/B 字符串，problemId 为内部数字 ID */
export interface HomeworkProblemRow {
  problemId: number;
  problemCode: string;
  displayId: string;
  displayTitle: string;
}

// --- 作业列表逻辑 ---
export function useHomeworkList() {
  const router = useRouter();
  const message = useMessage();

  const loading = ref(false);
  const tableData = ref<AdminHomeworkListVo[]>([]);
  const searchKeyword = ref('');

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  let fetchSeq = 0;

  const fetchHomeworks = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const data = await getAdminHomeworks({
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
      message.error(error instanceof Error ? error.message : '作业列表加载失败');
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchHomeworks();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchHomeworks();
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    fetchHomeworks();
  };

  const handleDelete = async (row: AdminHomeworkListVo) => {
    try {
      await deleteAdminHomework(row.id);
      message.success('作业已删除');
      pagination.page = 1;
      await fetchHomeworks();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除作业失败');
    }
  };

  const handleToggleStatus = async (row: AdminHomeworkListVo) => {
    const nextStatus = !row.status;
    try {
      await updateAdminHomeworkStatus(row.id, nextStatus);
      message.success(nextStatus ? '作业已启用' : '作业已禁用');
      await fetchHomeworks();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '状态更新失败');
    }
  };

  const columns: DataTableColumns<AdminHomeworkListVo> = [
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
      minWidth: 200,
      ellipsis: { tooltip: true },
      render(row) {
        return h(
          'a',
          {
            href: `/homework/${row.id}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
            onClick: (e: Event) => {
              e.preventDefault();
              window.open(`/homework/${row.id}`, '_blank');
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
          h('div', {}, `截止：${formatFullTime(row.endTime)}`),
        ]);
      },
    },
    { title: '题目数', key: 'problemCount', width: 90 },
    { title: '班级数', key: 'classCount', width: 90 },
    { title: '来源', key: 'source', width: 140, ellipsis: { tooltip: true } },
    { title: '创建者', key: 'author', width: 120 },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render(row) {
        return h(
          NTag,
          { type: row.status ? 'success' : 'error', size: 'small' },
          { default: () => (row.status ? '启用' : '禁用') },
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
              { default: () => (row.status ? '禁用' : '启用') },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => router.push({ name: 'AdminHomeworkEdit', params: { id: row.id } }),
              },
              { default: () => '编辑' },
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => handleDelete(row) },
              {
                trigger: () =>
                  h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => '删除' }),
                default: () => '确定删除该作业吗？',
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
    fetchHomeworks,
    handleDelete,
    handleToggleStatus,
  };
}

// --- 作业表单逻辑（添加/编辑） ---
export function useHomeworkForm() {
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
    source: '',
    status: true,
    timeRange: null as [number, number] | null,
    description: '',
    // 学生范围：后端 classIds 为数字数组
    targetClassIds: [] as number[],
    problems: [] as HomeworkProblemRow[],
  });

  // 学院 -> 年级 -> 班级（不引入后端不存在的“专业”维度）
  const studentSelectState = reactive({
    colleges: [] as OptionNode[],
    grades: [] as Array<{ label: string; value: string }>,
    classes: [] as OptionNode[],
    filterCollegeId: null as number | null,
    filterGrade: null as string | null,
  });

  // 存储所有加载过的班级信息，用于回显已选班级名称
  const classMap = ref(new Map<number, string>());

  const selectedClassList = computed(() => {
    return formValue.targetClassIds.map((id) => ({
      value: id,
      label: classMap.value.get(id) ?? String(id),
    }));
  });

  const fetchColleges = async () => {
    try {
      const list = await getColleges();
      studentSelectState.colleges = (list ?? []).map((item) => ({
        label: item.name,
        value: item.id,
      }));
    } catch (error) {
      studentSelectState.colleges = [];
      message.error(error instanceof Error ? error.message : '学院列表加载失败');
    }
  };

  // 局部请求序号：上级快速切换时旧响应不得回填
  let gradeSeq = 0;
  let classSeq = 0;

  const handleCollegeChange = (collegeId: number | null) => {
    studentSelectState.filterCollegeId = collegeId;
    studentSelectState.filterGrade = null;
    studentSelectState.grades = [];
    studentSelectState.classes = [];
    const seq = ++gradeSeq;
    classSeq += 1;
    if (!collegeId) return;
    void (async () => {
      try {
        const list = await getGrades(collegeId);
        if (seq !== gradeSeq) return;
        studentSelectState.grades = (list ?? []).map((item) => ({
          label: item.grade,
          value: item.grade,
        }));
      } catch (error) {
        if (seq !== gradeSeq) return;
        studentSelectState.grades = [];
        message.error(error instanceof Error ? error.message : '年级列表加载失败');
      }
    })();
  };

  const handleGradeChange = (grade: string | null) => {
    studentSelectState.filterGrade = grade;
    studentSelectState.classes = [];
    const seq = ++classSeq;
    const collegeId = studentSelectState.filterCollegeId;
    if (!collegeId || !grade) return;
    void (async () => {
      try {
        const list = await getClasses(collegeId, grade);
        if (seq !== classSeq) return;
        studentSelectState.classes = (list ?? []).map((item) => ({
          label: item.name,
          value: item.id,
        }));
        for (const item of list ?? []) {
          classMap.value.set(item.id, item.name);
        }
      } catch (error) {
        if (seq !== classSeq) return;
        studentSelectState.classes = [];
        message.error(error instanceof Error ? error.message : '班级列表加载失败');
      }
    })();
  };

  /** 依据已选班级 id 反查名称（后端无班级 by-id 接口，遍历真实学院/年级/班级） */
  const resolveClassNames = async (ids: number[]) => {
    const missing = ids.filter((id) => !classMap.value.has(id));
    if (missing.length === 0) return;
    try {
      // 学院之间、年级之间并发，避免按「学院×年级×班级」串行发出上百次请求
      const colleges = (await getColleges()) ?? [];
      const gradeLists = await Promise.all(
        colleges.map(async (college) => ({
          collegeId: college.id,
          grades: (await getGrades(college.id)) ?? [],
        })),
      );
      const classLists = await Promise.all(
        gradeLists.flatMap(({ collegeId, grades }) =>
          grades.map(async (grade) => (await getClasses(collegeId, grade.grade)) ?? []),
        ),
      );
      for (const classes of classLists) {
        for (const item of classes) {
          classMap.value.set(item.id, item.name);
        }
      }
    } catch {
      // 反查失败时保留 id 展示，不阻断编辑
    }
  };

  const handleRemoveClass = (id: number) => {
    const index = formValue.targetClassIds.indexOf(id);
    if (index > -1) {
      formValue.targetClassIds.splice(index, 1);
    }
  };

  const problemInput = ref('');
  // 防止重复并发添加，并配合记录代际作废旧响应
  const addingProblem = ref(false);

  const nextDisplayId = (): string => {
    const used = new Set(formValue.problems.map((p) => p.displayId.toUpperCase()));
    let index = 0;
    while (used.has(buildDisplayIdByIndex(index))) {
      index += 1;
    }
    return buildDisplayIdByIndex(index);
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
      message.warning('请输入作业名称');
      return;
    }
    if (!formValue.timeRange || formValue.timeRange.length !== 2) {
      message.warning('请选择作业时间');
      return;
    }
    if (formValue.targetClassIds.length === 0) {
      message.warning('请至少选择一个班级');
      return;
    }

    const problems: AdminHomeworkProblemPayload[] = formValue.problems.map((item) => ({
      problemId: item.problemId,
      displayId: item.displayId || null,
    }));

    const payload = {
      title: formValue.title.trim(),
      source: formValue.source.trim() || null,
      status: formValue.status,
      startTime: formValue.timeRange[0],
      endTime: formValue.timeRange[1],
      description: formValue.description || null,
      classIds: formValue.targetClassIds,
      problems,
    };

    const submitGen = detailSeq;
    saving.value = true;
    try {
      if (isEdit) {
        await updateAdminHomework(id as string | number, payload);
        if (submitGen !== detailSeq) return;
        message.success('作业已保存');
      } else {
        await createAdminHomework(payload);
        if (submitGen !== detailSeq) return;
        message.success('作业已创建');
      }
      router.push({ name: 'AdminHomeworkList' });
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
      const detail = await getAdminHomeworkDetail(targetId);
      if (seq !== detailSeq) return;
      // 先在本地组装题目元数据，await 期间若记录已切换则整体丢弃
      const problems = await Promise.all(
        (detail.problems ?? []).map(async (problem, index) => {
          const meta = await resolveProblemMeta(problem.problemId);
          return {
            problemId: problem.problemId,
            problemCode: meta.problemCode,
            displayId: problem.displayId ?? buildDisplayIdByIndex(index),
            displayTitle: meta.displayTitle,
          };
        }),
      );
      if (seq !== detailSeq) return;
      const classIds = (detail.classIds ?? []).slice();
      formValue.title = detail.title ?? '';
      formValue.source = detail.source ?? '';
      formValue.status = detail.status ?? false;
      formValue.description = detail.description ?? '';
      formValue.timeRange =
        detail.timeRange && detail.timeRange.length === 2
          ? [detail.timeRange[0]!, detail.timeRange[1]!]
          : null;
      formValue.targetClassIds = classIds;
      formValue.problems = problems;
      loadedDetailId.value = targetId;
      await fetchColleges();
      if (seq !== detailSeq) return;
      await resolveClassNames(classIds);
    } catch (error) {
      if (seq !== detailSeq) return;
      detailError.value = error instanceof Error ? error.message : '作业详情加载失败';
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
    studentSelectState,
    selectedClassList,
    problemInput,
    loading,
    saving,
    loadedDetailId,
    detailLoading,
    detailError,
    fetchColleges,
    handleCollegeChange,
    handleGradeChange,
    handleRemoveClass,
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
