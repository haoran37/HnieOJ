import { ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useTags } from '@/composables/useTags';

export function useProblemForm() {
  const message = useMessage();
  const router = useRouter();
  const formRef = ref(null);
  const loading = ref(false);
  const showSourceModal = ref(false);
  const showAlgorithmModal = ref(false);
  const { tagData, fetchTags } = useTags();

  // 模拟数据，实际应从后端获取
  const languageOptions = [
    { label: 'C', value: 'C' },
    { label: 'C++', value: 'C++' },
    { label: 'Java', value: 'Java' },
    { label: 'Python3', value: 'Python3' },
    { label: 'Python2', value: 'Python2' },
    { label: 'Golang', value: 'Golang' },
    { label: 'C#', value: 'C#' }
  ];

  const difficultyOptions = [
    { label: '入门', value: 1 },
    { label: '简单', value: 2 },
    { label: '中等', value: 3 },
    { label: '困难', value: 4 },
    { label: '噩梦', value: 5 }
  ];

  const problem = reactive({
    judgeMode: 'default',
    languages: ['C', 'C++', 'Java', 'Python3'],
    tags: [] as string[],
    problem: {
      auth: 1,
      author: 'admin',
      isRemote: false,
      problemId: '',
      description: '',
      source: ['HNIEOJ'] as string[],
      title: '',
      type: 0,
      timeLimit: 1000,
      memoryLimit: 256,
      input: '',
      output: '',
      difficulty: 1,
      examples: [{ input: '', output: '' }],
      ioScore: 100,
      hint: '',
      isRemoveEndBlank: true,
      openCaseResult: true,
      judgeCaseMode: 'default',
      isFileIO: false,
      ioReadFileName: null,
      ioWriteFileName: null
    },
    samples: [],
    codeTemplates: [],
    userExtraFile: {},
    judgeExtraFile: {}
  });

  const rules = {
    'problem.title': { required: true, message: '请输入标题', trigger: 'blur' },
    'problem.problemId': { required: true, message: '请输入Display ID', trigger: 'blur' }
  };

  const addExample = () => {
    problem.problem.examples.push({ input: '', output: '' });
  };

  const removeExample = (index: number) => {
    problem.problem.examples.splice(index, 1);
  };

  const handleSubmit = () => {
    // @ts-expect-error legacy form ref type from Naive UI
    formRef.value?.validate((errors: any) => {
      if (!errors) {
        loading.value = true;
        console.log('API Request: POST /api/admin/problem', problem);
        // 模拟提交
        setTimeout(() => {
          loading.value = false;
          message.success('操作成功');
          router.push({ name: 'AdminProblemList' });
        }, 1000);
      } else {
        message.error('请检查输入');
      }
    });
  };

  onMounted(() => {
    fetchTags();
  });

  return {
    formRef,
    loading,
    languageOptions,
    difficultyOptions,
    problem,
    rules,
    addExample,
    removeExample,
    showSourceModal,
    showAlgorithmModal,
    tagData,
    handleSubmit
  };
}
