import { ref, reactive, h } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, useMessage, NPopconfirm, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { stringToColor, stringToTextColor } from '@/utils/colorUtils';

// 比赛列表逻辑
export function useContestList() {
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
      fetchContests();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      fetchContests();
    }
  });

  const fetchContests = () => {
    loading.value = true;
    console.log('API Request: GET /api/admin/contest/list', {
      page: pagination.page,
      limit: pagination.pageSize,
      keyword: searchKeyword.value
    });

    // Mock Data
    setTimeout(() => {
      const mockData = Array.from({ length: pagination.pageSize }, (_, i) => {
        const id = (pagination.page - 1) * pagination.pageSize + i + 1;
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + i);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 5);

        const auth = i % 2 === 0 ? 'Internal' : 'External';
        const type = i % 3 === 0 ? 'ACM' : 'IOI';
        const permission = i % 4 === 0 ? 'Private' : 'Public';
        const customTags = ['单人赛'];

        // 标签生成逻辑
        const tags = [];
        tags.push({ name: permission === 'Public' ? '公开' : '私有' });
        tags.push({ name: auth === 'Internal' ? '校赛' : '外赛' });
        tags.push({ name: type === 'ACM' ? 'ACM赛制' : 'IOI赛制' });
        customTags.forEach(t => tags.push({ name: t }));

        return {
          id: id,
          contestId: 1000 + id,
          title: `第 ${id} 届湖南省大学生程序设计竞赛`,
          startTime: formatFullTime(startTime),
          endTime: formatFullTime(endTime),
          type: type,
          auth: auth,
          permission: permission,
          source: '湖南工程学院',
          author: '202202050231',
          status: i % 2 === 0, // true: active, false: disabled
          tags: tags
        };
      });
      
      tableData.value = mockData;
      pagination.itemCount = 100;
      loading.value = false;
    }, 500);
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchContests();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchContests();
  };

  const handleDelete = (row: any) => {
    console.log('API Request: DELETE /api/admin/contest', { id: row.id });
    message.success(`删除比赛 ${row.title} 成功`);
    fetchContests();
  };

  const handleToggleStatus = (row: any) => {
    const newStatus = !row.status;
    console.log('API Request: PUT /api/admin/contest/status', { id: row.id, status: newStatus });
    row.status = newStatus;
    message.success(`比赛 ${row.title} 已${newStatus ? '激活' : '禁用'}`);
  };

  const columns: DataTableColumns<any> = [
    {
      title: '编号',
      key: 'contestId',
      width: 100,
      render(row: any) {
        return h('span', { style: 'color: #000' }, row.contestId);
      }
    },
    {
      title: '名称',
      key: 'title',
      minWidth: 300,
      render(row: any) {
        return h(
          'a',
          {
            href: `/contest/${row.contestId}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
            onClick: (e: Event) => {
              e.preventDefault();
              window.open(`/contest/${row.contestId}`, '_blank');
            }
          },
          row.title
        );
      }
    },
    {
      title: '开始时间-结束时间',
      key: 'time',
      width: 230,
      render(row) {
      return h('div', { style: 'display: flex; flex-direction: column; font-size: 14px;' }, [
        h('div', { style: 'display: flex; align-items: center;' }, [
          h('span', { style: 'color: #999; margin-right: 4px; width: 40px; text-align: right;' }, 'begin: '),
          h('span', { style: 'color: #333;' }, formatFullTime(row.startTime)) 
        ]),
        h('div', { style: 'display: flex; align-items: center;' }, [
          h('span', { style: 'color: #999; margin-right: 4px; width: 40px; text-align: right;' }, 'end: '),
          h('span', { style: 'color: #333;' }, formatFullTime(row.endTime))
        ])
      ]);
    }
    },
    {
      title: '标签',
      key: 'tags',
      width: 200,
      render(row: any) {
        return h(NSpace, { size: 4 }, {
          default: () => row.tags.map((tag: any) => 
            h(NTag, {
              size: 'small',
              bordered: false,
              style: {
                backgroundColor: stringToColor(tag.name),
                color: stringToTextColor(tag.name)
              }
            }, { default: () => tag.name })
          )
        });
      }
    },
    { title: '来源', key: 'source', width: 170 },
    { title: '创建者', key: 'author', width: 160 },
    {
      title: '状态',
      key: 'status',
      width: 70,
      render(row: any) {
        return h(
          NTag,
          { type: row.status ? 'success' : 'error', size: 'small' },
          { default: () => (row.status ? '有效' : '禁用') }
        );
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render(row: any) {
        return h(NSpace, {}, {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => router.push({ name: 'AdminContestEdit', params: { id: row.id } })
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
                default: () => '确定删除该比赛吗？'
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
    fetchContests
  };
}

// 比赛表单逻辑（添加/编辑）
export function useContestForm() {
  const router = useRouter();
  const message = useMessage();
  const loading = ref(false);

  const formValue = reactive({
    title: '',
    auth: 'Internal', // Internal or External
    type: 'ACM', // ACM or IOI
    permission: 'Public', // Public or Private
    source: '',
    customTags: [] as string[],
    status: true,
    timeRange: null as [number, number] | null,
    description: '',
    link: '', // For External contests
    problems: [] as any[],
    accountList: [] as any[]
  });

  const typeOptions = [
    { label: 'ACM', value: 'ACM' },
    { label: 'IOI', value: 'IOI' }
  ];

  const authOptions = [
    { label: '校内比赛', value: 'Internal' },
    { label: '校外比赛', value: 'External' }
  ];

  const permissionOptions = [
    { label: '公开', value: 'Public' },
    { label: '私有', value: 'Private' }
  ];

  const problemInput = ref('');

  const handleAddAccount = (input: string) => {
    loading.value = true;
    console.log('API Request: GET /api/admin/user/check', { query: input });
    
    // Mock check
    setTimeout(() => {
      const exists = Math.random() > 0.1;
      if (exists) {
        if (formValue.accountList.some(a => a.uid === input || a.username === input)) {
          message.warning('账号已在列表中');
          loading.value = false;
          return;
        }

        const newAccount = {
          uid: input.match(/^\d+$/) ? input : '20220001',
          username: input.match(/^\d+$/) ? `User${input}` : input,
          type: Math.random() > 0.8 ? 'Team' : 'Personal'
        };
        formValue.accountList.push(newAccount);
        message.success('添加账号成功');
      } else {
        message.error('账号不存在');
      }
      loading.value = false;
    }, 300);
  };

  const handleRemoveAccount = (index: number) => {
    formValue.accountList.splice(index, 1);
  };

  const handleAddProblem = () => {
    if (!problemInput.value) return;
    
    loading.value = true;
    console.log('API Request: GET /api/admin/problem/check', { pid: problemInput.value });
    
    // Mock check
    setTimeout(() => {
      const exists = Math.random() > 0.1; 
      if (exists) {
        // 检查是否已存在
        if (formValue.problems.some(p => p.problemId === problemInput.value)) {
          message.warning('题目已在列表中');
          loading.value = false;
          return;
        }

        const newProblem = {
          id: problemInput.value, 
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
      message.warning('请输入比赛名称');
      return;
    }
    if (!formValue.timeRange) {
      message.warning('请选择比赛时间');
      return;
    }
    if (formValue.auth === 'External' && !formValue.link) {
      message.warning('请输入比赛链接');
      return;
    }
    
    loading.value = true;
    const api = isEdit ? `/api/admin/contest/${id}` : '/api/admin/contest';
    const method = isEdit ? 'PUT' : 'POST';
    
    const payload = {
      ...formValue,
      startTime: formValue.timeRange[0],
      endTime: formValue.timeRange[1]
    };

    console.log(`API Request: ${method} ${api}`, payload);

    setTimeout(() => {
      message.success(isEdit ? '更新成功' : '创建成功');
      loading.value = false;
      router.push({ name: 'AdminContestList' });
    }, 500);
  };

  // Load data for edit
  const loadData = (id: string) => {
    loading.value = true;
    console.log(`API Request: GET /api/admin/contest/${id}`);
    
    setTimeout(() => {
      const now = Date.now();
      formValue.title = `第 ${id} 届湖南省大学生程序设计竞赛`;
      formValue.auth = 'Internal';
      formValue.type = 'ACM';
      formValue.permission = 'Private';
      formValue.source = 'HNCPC';
      formValue.customTags = ['单人赛'];
      formValue.description = '# Contest Description\n\nThis is a contest.';
      formValue.status = true;
      formValue.timeRange = [now, now + 3600 * 1000 * 5];
      formValue.link = '';
      formValue.problems = [
        { id: 1, problemId: '1001', title: 'A+B Problem', difficulty: 'Low' },
        { id: 2, problemId: '1002', title: 'Matrix', difficulty: 'Mid' }
      ];
      formValue.accountList = [
        { uid: '20220101', username: 'TestUser1', type: 'Personal' },
        { uid: '20220102', username: 'TestTeam1', type: 'Team' }
      ];
      loading.value = false;
    }, 500);
  };

  return {
    formValue,
    typeOptions,
    authOptions,
    permissionOptions,
    problemInput,
    loading,
    handleAddProblem,
    handleRemoveProblem,
    handleMoveUp,
    handleMoveDown,
    handleAddAccount,
    handleRemoveAccount,
    handleSubmit,
    loadData
  };
}
