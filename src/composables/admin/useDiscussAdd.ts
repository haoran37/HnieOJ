import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';

export function useDiscussAdd() {
  const userStore = useUserStore();
  const router = useRouter();
  const route = useRoute();
  const message = useMessage();

  const formRef = ref<any>(null);
  
  const formValue = ref({
    title: '',
    category: 'Problem',
    problemId: '',
    isTop: false,
    content: '',
    tags: [] as string[]
  });

  // 初始化：如果路由有 problemId 参数，自动填入
  if (route.query.problemId) {
    formValue.value.problemId = route.query.problemId as string;
    formValue.value.category = 'Problem';
  }

  const rules = {
    title: {
      required: true,
      message: '请输入标题',
      trigger: 'blur'
    },
    category: {
      required: true,
      message: '请选择板块',
      trigger: 'change'
    },
    problemId: {
      required: true,
      validator: (_: any, value: string) => {
        if (formValue.value.category === 'Problem' && !value) {
          return new Error('请输入题目ID');
        }
        return true;
      },
      trigger: 'blur'
    },
    content: {
      required: true,
      message: '请输入内容',
      trigger: 'blur'
    }
  };

  const categoryOptions = computed(() => {
    const options = [
      { label: '题目讨论', value: 'Problem' }
    ];
    if (userStore.isAdmin) {
       options.unshift({ label: '站内事务', value: 'Site' });
    }
    return options;
  });

  const showProblemIdInput = computed(() => formValue.value.category === 'Problem');
  const showTopSwitch = computed(() => formValue.value.category === 'Site');

  //TODO: 替换真实api
  const validatingProblem = ref(false);
  const checkProblemId = async (pid: string) => {
     if (!pid) return false;
     console.log(`[Mock API] Checking problem ID: ${pid}`);
     return new Promise<boolean>((resolve) => {
         setTimeout(() => {
             // 模拟：P1000-P1999 存在
             const num = parseInt(pid.replace(/^P/i, ''));
             const exists = !isNaN(num) && num >= 1000 && num < 2000;
             resolve(exists);
         }, 500);
     });
  };

  const publishing = ref(false);
  
  const handlePublish = async (e: MouseEvent) => {
    e.preventDefault();
    formRef.value?.validate(async (errors: any) => {
        if (!errors) {
            // 如果是题目讨论，校验题目ID
            if (showProblemIdInput.value) {
                validatingProblem.value = true;
                try {
                    const exists = await checkProblemId(formValue.value.problemId);
                    if (!exists) {
                        message.error('题目不存在 (P1000-P1999)');
                        validatingProblem.value = false;
                        return;
                    }
                } catch (_err) {
                    message.error('校验题目失败');
                    validatingProblem.value = false;
                    return;
                }
                validatingProblem.value = false;
            }

            publishing.value = true;
            //TODO: 替换真实api
            console.log('[Mock API] Publishing discussion:', formValue.value);
            
            setTimeout(() => {
                message.success('发布成功');
                publishing.value = false;
                router.push('/discuss');
            }, 800);
        } else {
            message.error('请检查填写内容');
        }
    });
  };

  const handleCancel = () => {
      router.back();
  };

  return {
      formRef,
      formValue,
      rules,
      categoryOptions,
      showProblemIdInput,
      showTopSwitch,
      validatingProblem,
      publishing,
      handlePublish,
      handleCancel
  };
}
