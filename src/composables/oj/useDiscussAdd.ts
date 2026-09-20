import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ApiError, createDiscussion, getProblemDetail } from '@/utils/api';

export function useDiscussAdd() {
  const userStore = useUserStore();
  const router = useRouter();
  const route = useRoute();
  const message = useMessage();

  const formRef = ref<{ validate: () => Promise<void> } | null>(null);

  const formValue = ref({
    title: '',
    category: 'Problem' as 'Site' | 'Problem',
    problemId: '',
    content: '',
  });

  // 支持从题目入口携带 problemCode 创建讨论
  if (route.query.problemCode) {
    formValue.value.problemId = route.query.problemCode as string;
    formValue.value.category = 'Problem';
  } else if (route.query.problemId) {
    formValue.value.problemId = route.query.problemId as string;
    formValue.value.category = 'Problem';
  }

  const rules = {
    title: { required: true, message: '请输入标题', trigger: 'blur' },
    category: { required: true, message: '请选择板块', trigger: 'change' },
    content: { required: true, message: '请输入内容', trigger: 'blur' },
    problemId: {
      validator: (_: unknown, value: string) => {
        if (formValue.value.category === 'Problem' && !value) {
          return new Error('请输入题目编号');
        }
        return true;
      },
      trigger: 'blur',
    },
  };

  const categoryOptions = computed(() => {
    const options = [{ label: '题目讨论', value: 'Problem' }];
    if (userStore.isAdmin) {
      options.unshift({ label: '站内事务', value: 'Site' });
    }
    return options;
  });

  const showProblemIdInput = computed(() => formValue.value.category === 'Problem');

  const publishing = ref(false);
  const validatingProblem = ref(false);

  // 通过题目详情接口验证展示编号是否存在。
  // 只有明确“不存在”（404）才返回 false；401/网络等错误必须抛出真实原因，
  // 不能把后端故障伪装成“题目编号不存在”。
  const checkProblemCode = async (code: string): Promise<boolean> => {
    if (!code) return true;
    validatingProblem.value = true;
    try {
      await getProblemDetail(code);
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === 404)) {
        return false;
      }
      throw err;
    } finally {
      validatingProblem.value = false;
    }
  };

  const handlePublish = async () => {
    // 互斥标志覆盖校验/查题/提交全过程，避免并发点击创建重复帖子
    if (publishing.value) return;
    publishing.value = true;
    try {
      try {
        await formRef.value?.validate();
      } catch {
        return;
      }

      if (showProblemIdInput.value) {
        let exists: boolean;
        try {
          exists = await checkProblemCode(formValue.value.problemId.trim());
        } catch (err) {
          message.error(err instanceof Error ? err.message : '题目编号校验失败');
          return;
        }
        if (!exists) {
          message.error('题目编号不存在，请检查后重试');
          return;
        }
      }

      // 创建接口不接受 isTop（后端对 isTop=true 一律 403）；置顶在创建后由管理端编辑设置
      const result = await createDiscussion({
        title: formValue.value.title.trim(),
        category: formValue.value.category,
        content: formValue.value.content,
        problemCode: showProblemIdInput.value ? formValue.value.problemId.trim() : undefined,
      });
      message.success('发布成功');
      if (result?.id) {
        router.push(`/discuss/${result.id}`);
      } else {
        router.push('/discuss');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发布失败');
    } finally {
      publishing.value = false;
    }
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
    validatingProblem,
    publishing,
    handlePublish,
    handleCancel,
  };
}
