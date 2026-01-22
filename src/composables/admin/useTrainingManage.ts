import { ref, reactive, h } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, useMessage, NPopconfirm } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';

export function useTrainingManage() {
  const router = useRouter();
  const message = useMessage();

  const loading = ref(false);
  const tableData = ref<any[]>([]);
  const searchKeyword = ref('');

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
      fetchTrainings();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      fetchTrainings();
    }
  });

  const fetchTrainings = () => {
    loading.value = true;
    console.log('API Request: GET /api/admin/training/list', {
      page: pagination.page,
      limit: pagination.pageSize,
      keyword: searchKeyword.value
    });

    // Mock Data
    setTimeout(() => {
      const mockData = Array.from({ length: pagination.pageSize }, (_, i) => {
        const id = (pagination.page - 1) * pagination.pageSize + i + 1;
        return {
          id: id,
          trainingId: 1000 + id,
          title: `Training Plan ${id}`,
          problemCount: Math.floor(Math.random() * 50) + 10,
          author: 'admin',
          createTime: formatFullTime('2023-01-01 12:00:00'),
          status: i % 2 === 0 // true: active, false: closed
        };
      });
      
      tableData.value = mockData;
      pagination.itemCount = 100;
      loading.value = false;
    }, 500);
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchTrainings();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchTrainings();
  };

  const handleDelete = (row: any) => {
    console.log('API Request: DELETE /api/admin/training', { id: row.id });
    message.success(`删除题单 ${row.title} 成功`);
    fetchTrainings();
  };

  const handleToggleStatus = (row: any) => {
    const newStatus = !row.status;
    console.log('API Request: PUT /api/admin/training/status', { id: row.id, status: newStatus });
    row.status = newStatus;
    message.success(`题单 ${row.title} 已${newStatus ? '激活' : '关闭'}`);
  };

  const columns = [
    {
      title: '编号',
      key: 'trainingId',
      width: 100
    },
    {
      title: '名称',
      key: 'title',
      minWidth: 200,
      render(row: any) {
        return h(
          'a',
          {
            href: `/training/${row.trainingId}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
            onClick: (e: Event) => {
              e.preventDefault();
              router.push(`/training/${row.trainingId}`);
            }
          },
          row.title
        );
      }
    },
    { title: '题目数', key: 'problemCount', width: 100 },
    { title: '创建者', key: 'author', width: 120 },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render(row: any) {
        return h(
          NTag,
          { type: row.status ? 'success' : 'error', size: 'small' },
          { default: () => (row.status ? '激活' : '关闭') }
        );
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render(row: any) {
        return h(NSpace, {}, {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => router.push({ name: 'AdminTrainingEdit', params: { id: row.id } })
              },
              { default: () => '编辑' }
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row)
              },
              {
                trigger: () => h(
                  NButton,
                  {
                    size: 'small',
                    type: 'error'
                  },
                  { default: () => '删除' }
                ),
                default: () => '确定删除该题单吗？'
              }
            )
          ]
        });
      }
    }
  ];

  return {
    loading,
    tableData,
    pagination,
    columns,
    searchKeyword,
    handleSearch,
    handlePageChange,
    fetchTrainings
  };
}

export function useTrainingForm() {
  const router = useRouter();
  const message = useMessage();
  const loading = ref(false);

  const formValue = reactive({
    title: '',
    type: 'Official', // Official or User
    description: '',
    status: true,
    problems: [] as any[]
  });

  const typeOptions = [
    { label: '官方精选', value: 'Official' },
    { label: '用户分享', value: 'User' }
  ];

  const problemInput = ref('');

  const handleAddProblem = () => {
    if (!problemInput.value) return;
    
    loading.value = true;
    console.log('API Request: GET /api/admin/problem/check', { pid: problemInput.value });
    
    // Mock check
    setTimeout(() => {
      const exists = Math.random() > 0.2; // 80% chance exists
      if (exists) {
        const newProblem = {
          id: problemInput.value, // Use problemId as unique key
          problemId: problemInput.value,
          title: `Problem ${problemInput.value}`,
          difficulty: ['Low', 'Mid', 'High'][Math.floor(Math.random() * 3)]
        };
        formValue.problems.push(newProblem);
        problemInput.value = '';
        message.success('添加成功');
      } else {
        message.error('题目不存在');
      }
      loading.value = false;
    }, 300);
  };

  const handleRemoveProblem = (index: number) => {
    formValue.problems.splice(index, 1);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const temp = formValue.problems[index];
      formValue.problems[index] = formValue.problems[index - 1];
      formValue.problems[index - 1] = temp;
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < formValue.problems.length - 1) {
      const temp = formValue.problems[index];
      formValue.problems[index] = formValue.problems[index + 1];
      formValue.problems[index + 1] = temp;
    }
  };

  const handleSubmit = (isEdit: boolean, id?: string) => {
    if (!formValue.title) {
      message.warning('请输入题单名称');
      return;
    }
    
    loading.value = true;
    const api = isEdit ? `/api/admin/training/${id}` : '/api/admin/training';
    const method = isEdit ? 'PUT' : 'POST';
    
    console.log(`API Request: ${method} ${api}`, formValue);

    setTimeout(() => {
      message.success(isEdit ? '更新成功' : '创建成功');
      loading.value = false;
      router.push({ name: 'AdminTrainingList' });
    }, 500);
  };

  // Load data for edit
  const loadData = (id: string) => {
    loading.value = true;
    console.log(`API Request: GET /api/admin/training/${id}`);
    
    setTimeout(() => {
      formValue.title = `Training Plan ${id}`;
      formValue.type = 'Official';
      formValue.description = '# Description\n\nThis is a training plan.';
      formValue.status = true;
      formValue.problems = [
        { id: 1, problemId: '1001', title: 'A+B Problem', difficulty: 'Low' },
        { id: 2, problemId: '1002', title: 'Matrix', difficulty: 'Mid' }
      ];
      loading.value = false;
    }, 500);
  };

  return {
    formValue,
    typeOptions,
    problemInput,
    loading,
    handleAddProblem,
    handleRemoveProblem,
    handleMoveUp,
    handleMoveDown,
    handleSubmit,
    loadData
  };
}
