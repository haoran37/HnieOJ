import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import {
  createAdminProblem,
  deleteAdminProblemImage,
  downloadProblemTestCase,
  downloadProblemTestdata,
  getAdminProblemDetail,
  getAdminProblemList,
  updateAdminProblem,
  uploadAdminProblemImage,
  uploadAdminProblemTestdata,
  type AdminProblemPayload,
  type AdminProblemRequest,
} from '@/utils/api';
import { saveBlob } from '@/utils/download';

/** 表单内 examples 恒为数组，便于模板 v-for 与编辑 */
export type AdminProblemForm = Omit<AdminProblemRequest, 'examples'> & {
  examples: NonNullable<AdminProblemRequest['examples']>;
};

const JUDGE_MODE_OPTIONS = [
  { label: '普通判题', value: 'default' },
  { label: '特殊判题', value: 'spj' },
  { label: '交互判题', value: 'interactive' },
];

// 后端 ProblemDifficultyConstant：0 简单 / 1 中等 / 2 困难
const DIFFICULTY_OPTIONS = [
  { label: '简单', value: 0 },
  { label: '中等', value: 1 },
  { label: '困难', value: 2 },
];

const AUTH_OPTIONS = [
  { label: '公开', value: 1 },
  { label: '私有', value: 2 },
  { label: '仅比赛', value: 3 },
];

const IMAGE_URL_PATTERN = /\/oj\/images\/(\d+)\/([^\s)"'\\]+)/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createEmptyProblem(): AdminProblemForm {
  return {
    problemCode: '',
    title: '',
    author: null,
    type: 0,
    judgeMode: 'default',
    timeLimit: 1000,
    memoryLimit: 256,
    stackLimit: 128,
    description: '',
    input: '',
    output: '',
    examples: [{ input: '', output: '' }],
    hint: '',
    difficulty: 0,
    auth: 1,
    ioScore: 100,
    isRemote: false,
    source: '',
    spjCode: '',
    spjLanguage: 'c',
    spjTimeLimit: 2000,
    spjMemoryLimit: 256,
    spjStackLimit: 128,
    spjOutputLimit: 16777216,
    spjProtocol: 'hnieoj-result-json-v1',
    interactorCode: '',
    interactorLanguage: 'c',
    interactorTimeLimit: 5000,
    interactorMemoryLimit: 256,
    interactorStackLimit: 128,
    interactorOutputLimit: 16777216,
    interactorProtocol: 'hnieoj-result-json-v1',
    isRemoveEndBlank: true,
    openCaseResult: true,
  };
}

export function useProblemForm() {
  const message = useMessage();
  const route = useRoute();
  const router = useRouter();

  const formRef = ref<{ validate: () => Promise<unknown> } | null>(null);
  const loading = ref(false);
  const detailLoading = ref(false);
  const notFound = ref(false);
  const savingTestdata = ref(false);
  const uploadingImage = ref(false);
  const caseNo = ref<number | null>(null);

  const problem = reactive<AdminProblemForm>(createEmptyProblem());
  const tags = ref<string[]>([]);
  const currentProblemId = ref<number | null>(null);

  const routeId = computed<number | null>(() => {
    const raw = route.params.id;
    const parsed = Number(Array.isArray(raw) ? raw[0] : raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });
  const isEdit = computed(() => routeId.value !== null);

  const languageOptions = JUDGE_MODE_OPTIONS;
  const difficultyOptions = DIFFICULTY_OPTIONS;
  const authOptions = AUTH_OPTIONS;

  const rules = {
    'problemCode': { required: true, message: '请输入展示编号（PID）', trigger: 'blur' },
    'title': { required: true, message: '请输入题目标题', trigger: 'blur' },
  };

  // 题面中引用的图片（由描述中的真实 /oj/images/{id}/{filename} 链接推导，不额外造接口）。
  // 只管理当前题目所属图片，避免把其它题目的图片链接当成当前题目的可删除资源。
  const problemImages = computed<string[]>(() => {
    const problemId = currentProblemId.value;
    if (!problemId) return [];
    const text = problem.description ?? '';
    const names = new Set<string>();
    IMAGE_URL_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMAGE_URL_PATTERN.exec(text)) !== null) {
      if (Number(match[1]) === problemId && match[2]) names.add(match[2]);
    }
    return Array.from(names);
  });

  const applyDetail = (detail: { problem: AdminProblemRequest; tags?: string[] | null }, fallbackId: number) => {
    const incoming = detail.problem ?? ({} as AdminProblemRequest);
    Object.assign(problem, createEmptyProblem(), incoming);
    problem.id = incoming.id ?? fallbackId;
    // 后端 examples 可选：保留真实的 []/null 为空数组，不强制补空行（否则纯标题更新会被校验拦住）
    problem.examples = (incoming.examples ?? []).map((item) => ({
      input: item.input ?? '',
      output: item.output ?? '',
    }));
    problem.source = incoming.source ?? '';
    problem.judgeMode = incoming.judgeMode ?? 'default';
    // 四个题面 Markdown 字段绑定 v-md-editor，只接受字符串；后端 ProblemRequest 允许 null，
    // 若让 null 覆盖空串默认值会在渲染时崩溃。这里仅把 null 归一为空串，非 null 文本原样保留。
    problem.description = incoming.description ?? '';
    problem.input = incoming.input ?? '';
    problem.output = incoming.output ?? '';
    problem.hint = incoming.hint ?? '';
    tags.value = detail.tags ?? [];
    currentProblemId.value = problem.id ?? fallbackId;
  };

  // 详情请求序号：路由复用/快速切换时旧响应不得覆盖新题目
  let detailSeq = 0;

  const fetchDetail = async (id: number) => {
    const seq = ++detailSeq;
    detailLoading.value = true;
    notFound.value = false;
    // 路由切换/重新加载期间先作废旧 id，避免对上一道题目提交或上传
    currentProblemId.value = null;
    // 新的详情代次开始：上一代在途操作的完成回调不再清理这些加载态，
    // 主动释放，避免过期操作把新一轮表单卡在 loading。
    loading.value = false;
    uploadingImage.value = false;
    savingTestdata.value = false;
    try {
      const detail = await getAdminProblemDetail(id);
      if (seq !== detailSeq) return;
      applyDetail(detail, id);
    } catch (error) {
      if (seq !== detailSeq) return;
      notFound.value = true;
      message.error(error instanceof Error ? error.message : '题目详情加载失败');
    } finally {
      if (seq === detailSeq) detailLoading.value = false;
    }
  };

  const addExample = () => {
    problem.examples = problem.examples ?? [];
    problem.examples.push({ input: '', output: '' });
  };

  const removeExample = (index: number) => {
    (problem.examples ?? []).splice(index, 1);
  };

  const insertImageMarkdown = (url: string) => {
    const alt = url.split('/').pop() ?? 'image';
    const current = problem.description ?? '';
    problem.description = `${current}${current.endsWith('\n') || current === '' ? '' : '\n'}![${alt}](${url})\n`;
  };

  // 只用当前草稿移除被删除图片的引用，避免整份重载把未保存的标题/标签/正文覆盖
  const removeImageReference = (problemId: number, filename: string) => {
    const url = `/oj/images/${problemId}/${escapeRegExp(filename)}`;
    const current = problem.description ?? '';
    problem.description = current
      .replace(new RegExp(`!\\[[^\\]]*\\]\\(${url}\\)`, 'g'), '')
      .replace(new RegExp(`\\[[^\\]]*\\]\\(${url}\\)`, 'g'), '')
      .replace(new RegExp(url, 'g'), '');
  };

  // 创建成功后需要真实内部 id 才能上传资源：用列表按 problemCode 精确回查，不猜 id
  const resolveProblemId = async (problemCode: string): Promise<number | null> => {
    try {
      const page = await getAdminProblemList({ page: 1, pageSize: 100, keyword: problemCode });
      const matched = (page.list ?? []).find((item) => item.problemCode === problemCode);
      return matched?.id ?? null;
    } catch {
      return null;
    }
  };

  const handleUploadTestdata = async (file: File): Promise<boolean> => {
    const problemId = currentProblemId.value;
    if (!problemId) {
      message.warning('请先保存题目，再上传测试数据');
      return false;
    }
    // 记录操作发起时的详情代次，返回后代次或题目已变则丢弃结果
    const seq = detailSeq;
    savingTestdata.value = true;
    try {
      await uploadAdminProblemTestdata(problemId, file);
      if (seq !== detailSeq || currentProblemId.value !== problemId) return false;
      message.success('测试数据已上传');
      return true;
    } catch (error) {
      if (seq !== detailSeq || currentProblemId.value !== problemId) return false;
      message.error(error instanceof Error ? error.message : '测试数据上传失败');
      return false;
    } finally {
      // 过期操作不得清理新一轮操作的 loading 状态
      if (seq === detailSeq) savingTestdata.value = false;
    }
  };

  const handleDownloadTestdata = async () => {
    const problemId = currentProblemId.value;
    if (!problemId) return;
    // 下载期间路由可能切换，文件名/请求都用发起时的题目上下文
    const label = problem.problemCode || 'problem';
    try {
      const blob = await downloadProblemTestdata(problemId);
      saveBlob(blob, `${label}-testdata.zip`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '测试数据下载失败');
    }
  };

  const handleDownloadCase = async () => {
    const problemId = currentProblemId.value;
    const targetCase = caseNo.value;
    if (!problemId || !targetCase) {
      message.warning('请输入要下载的测试点编号');
      return;
    }
    const label = problem.problemCode || 'problem';
    try {
      const blob = await downloadProblemTestCase(problemId, targetCase);
      saveBlob(blob, `${label}-case-${targetCase}.zip`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '测试点下载失败');
    }
  };

  const handleUploadImage = async (file: File): Promise<boolean> => {
    const problemId = currentProblemId.value;
    if (!problemId) {
      message.warning('请先保存题目，再上传题面图片');
      return false;
    }
    // 记录操作发起时的详情代次：即使重新回到同一题目，代次也已变化
    const seq = detailSeq;
    uploadingImage.value = true;
    try {
      const url = await uploadAdminProblemImage(problemId, file);
      // 上传期间若已切换到其它题目或重新加载，丢弃过期结果，避免把旧图片插入新草稿
      if (seq !== detailSeq || currentProblemId.value !== problemId) return false;
      if (!url) {
        message.error('图片上传失败，请稍后重试');
        return false;
      }
      insertImageMarkdown(url);
      message.success('图片已上传并插入题面');
      return true;
    } catch (error) {
      if (seq !== detailSeq || currentProblemId.value !== problemId) return false;
      message.error(error instanceof Error ? error.message : '图片上传失败');
      return false;
    } finally {
      // 过期操作不得清理新一轮操作的 loading 状态
      if (seq === detailSeq) uploadingImage.value = false;
    }
  };

  const handleDeleteImage = async (filename: string) => {
    const problemId = currentProblemId.value;
    if (!problemId) {
      message.warning('题目尚未就绪，暂时无法删除图片');
      return;
    }
    // 记录操作发起时的详情代次，返回后代次或题目已变则丢弃结果
    const seq = detailSeq;
    try {
      await deleteAdminProblemImage(problemId, filename);
      // 删除返回时题目已切换或重新加载：不改动新题目草稿
      if (seq !== detailSeq || currentProblemId.value !== problemId) return;
      removeImageReference(problemId, filename);
      message.success('图片已删除，保存题目后生效');
    } catch (error) {
      if (seq !== detailSeq || currentProblemId.value !== problemId) return;
      message.error(error instanceof Error ? error.message : '图片删除失败');
    }
  };

  const buildPayload = (): AdminProblemPayload => ({
    problem: {
      ...problem,
      id: isEdit.value ? currentProblemId.value ?? problem.id ?? undefined : undefined,
      examples: (problem.examples ?? []).map((item) => ({
        input: item.input ?? '',
        output: item.output ?? '',
      })),
    },
    tags: [...tags.value],
  });

  const validateExamples = (): boolean => {
    const examples = problem.examples ?? [];
    for (let index = 0; index < examples.length; index += 1) {
      const item = examples[index];
      if (!item || !item.input?.trim() || !item.output?.trim()) {
        message.error(`第 ${index + 1} 组样例的输入和输出都不能为空`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (loading.value) return;
    // 详情仍在加载或加载失败时不允许提交，避免把旧题目 id 写回
    if (isEdit.value && (detailLoading.value || notFound.value || !currentProblemId.value)) {
      message.warning('题目详情尚未就绪，请稍后再试');
      return;
    }
    // 记录提交发起时的详情代次：校验期间可能切换题目或重新加载
    const seq = detailSeq;
    try {
      await formRef.value?.validate();
    } catch {
      message.error('请检查必填项');
      return;
    }
    // 校验是异步的，期间代次已变说明表单已进入新一轮访问，放弃本次提交
    if (seq !== detailSeq) return;
    if (!validateExamples()) return;

    loading.value = true;
    try {
      const editing = isEdit.value;
      const submitId = currentProblemId.value;
      const payload = buildPayload();
      if (editing) {
        await updateAdminProblem(payload);
        message.success('题目已保存');
        // 保存期间若已切换题目或重新加载，不得用旧 id 重载并覆盖新草稿
        if (submitId && seq === detailSeq && currentProblemId.value === submitId) await fetchDetail(submitId);
      } else {
        await createAdminProblem(payload);
        message.success('题目已创建');
        const createdId = await resolveProblemId(problem.problemCode);
        if (createdId) {
          await router.replace({ name: 'AdminProblemEdit', params: { id: createdId } });
        } else {
          message.warning('题目已创建，但未定位到该题目，请到列表中打开编辑页维护测试数据与图片');
          await router.push({ name: 'AdminProblemList' });
        }
      }
    } catch (error) {
      // 失败保留用户输入，不做假成功
      message.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      // 过期操作不得清理新一轮操作的 loading 状态
      if (seq === detailSeq) loading.value = false;
    }
  };

  const handleCancel = () => {
    router.push({ name: 'AdminProblemList' });
  };

  onMounted(() => {
    if (routeId.value) fetchDetail(routeId.value);
  });

  watch(routeId, (id) => {
    if (id && isEdit.value) fetchDetail(id);
  });

  onBeforeUnmount(() => {
    // 卸载后作废在途详情请求，并清空当前 id，避免过期上传/删除结果写入草稿
    detailSeq += 1;
    currentProblemId.value = null;
  });

  return {
    formRef,
    loading,
    detailLoading,
    notFound,
    isEdit,
    savingTestdata,
    uploadingImage,
    caseNo,
    problem,
    tags,
    problemImages,
    languageOptions,
    difficultyOptions,
    authOptions,
    rules,
    addExample,
    removeExample,
    handleSubmit,
    handleCancel,
    handleUploadTestdata,
    handleDownloadTestdata,
    handleDownloadCase,
    handleUploadImage,
    handleDeleteImage,
    fetchDetail,
  };
}
