import { ref, reactive } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';

// 新闻数据接口
export interface NewsItem {
  id: string;
  title: string;
  content: string; // Markdown
  author: string;
  createTime: number;
  updateTime: number;
}

export function useAdminNews() {
  const message = useMessage();
  const dialog = useDialog();
  
  const loading = ref(false);
  const showModal = ref(false);
  const modalType = ref<'create' | 'edit'>('create');
  const submitting = ref(false);

  //TODO: 从后端获取
  const newsList = ref<NewsItem[]>([
    {
      id: '1',
      title: 'HnieOJ 2.0 版本更新日志',
      content: '# 更新日志\n\n- 新增了**暗黑模式**\n- 优化了判题速度',
      author: 'Admin',
      createTime: Date.now() - 10000000,
      updateTime: Date.now()
    },
    {
      id: '2',
      title: '关于寒假集训的通知',
      content: '> 请各位同学准时参加...',
      author: 'Teacher Li',
      createTime: Date.now() - 20000000,
      updateTime: Date.now() - 500000
    }
  ]);

  const formModel = reactive({
    id: '',
    title: '',
    content: ''
  });


  // 打开模态框
  const openModal = (type: 'create' | 'edit', row?: NewsItem) => {
    modalType.value = type;
    if (type === 'edit' && row) {
      formModel.id = row.id;
      formModel.title = row.title;
      formModel.content = row.content;
    } else {
      formModel.id = '';
      formModel.title = '';
      formModel.content = '';
    }
    showModal.value = true;
  };

  // 提交表单 (新增/编辑)
  const handleSubmit = async () => {
    if (!formModel.title || !formModel.content) {
      message.warning('标题和内容不能为空');
      return;
    }

    submitting.value = true;

    //TODO: 替换真实api
    // const req = modalType.value === 'create' ? api.news.create(formModel) : api.news.update(formModel);
    // await req.send();

    setTimeout(() => {
      if (modalType.value === 'create') {
        const newItem: NewsItem = {
          id: Date.now().toString(),
          title: formModel.title,
          content: formModel.content,
          author: 'Admin', // 实际从 userStore 获取
          createTime: Date.now(),
          updateTime: Date.now()
        };
        newsList.value.unshift(newItem);
        message.success('发布成功');
      } else {
        const index = newsList.value.findIndex(item => item.id === formModel.id);
        if (index !== -1) {
          const oldItem = newsList.value[index];
          if (oldItem) {
            newsList.value[index] = {
              ...oldItem,
              title: formModel.title,
              content: formModel.content,
              updateTime: Date.now()
            };
            message.success('更新成功');
          }
        }
      }
      submitting.value = false;
      showModal.value = false;
    }, 600);
  };

  // 删除新闻
  const handleDelete = (row: NewsItem) => {
    dialog.warning({
      title: '警告',
      content: `确定要删除新闻 "${row.title}" 吗？此操作不可恢复。`,
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: () => {
        //TODO: Alova 请求 api.news.delete(row.id)
        loading.value = true;
        setTimeout(() => {
          newsList.value = newsList.value.filter(item => item.id !== row.id);
          message.success('已删除');
          loading.value = false;
        }, 500);
      }
    });
  };

  return {
    loading,
    submitting,
    showModal,
    modalType,
    newsList,
    formModel,
    openModal,
    handleSubmit,
    handleDelete,
    formatFullTime
  };
}