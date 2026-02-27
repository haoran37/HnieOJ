import { ref, reactive, h, computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, useMessage, NPopconfirm, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { stringToColor, stringToTextColor } from '@/utils/colorUtils';

// --- 类型定义 ---
export interface OptionNode {
  label: string;
  value: string;
  disabled?: boolean;
}

// --- 作业列表逻辑 ---
export function useHomeworkList() {
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
      fetchHomeworks();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      fetchHomeworks();
    }
  });

  const fetchHomeworks = () => {
    loading.value = true;
    console.log('API Request: GET /api/admin/homework/list', {
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
        endTime.setHours(endTime.getHours() + 48); // 2天后截止

        const customTags = ['数据结构', '算法'];
        
        // 系统自动生成的截止日期标签
        const deadlineTag = `截止: ${endTime.getMonth() + 1}-${endTime.getDate()}`;

        // 标签生成逻辑
        const tags = [];
        tags.push({ name: deadlineTag, type: 'system' });
        customTags.forEach(t => tags.push({ name: t, type: 'custom' }));

        return {
          id: id,
          homeworkId: 1000 + id,
          title: `数据结构作业 ${id}`,
          startTime: formatFullTime(startTime),
          endTime: formatFullTime(endTime),
          source: '计算机学院',
          author: 'TeacherWang',
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
    fetchHomeworks();
  };

  const handleDelete = (row: any) => {
    console.log('API Request: DELETE /api/admin/homework', { id: row.id });
    message.success(`删除作业 ${row.title} 成功`);
    fetchHomeworks();
  };

  const _handleToggleStatus = (row: any) => {
    const newStatus = !row.status;
    console.log('API Request: PUT /api/admin/homework/status', { id: row.id, status: newStatus });
    row.status = newStatus;
    message.success(`作业 ${row.title} 已${newStatus ? '激活' : '禁用'}`);
  };

  const columns: DataTableColumns<any> = [
    {
      title: '编号',
      key: 'homeworkId',
      width: 100,
      render(row: any) {
        return h('span', { style: 'color: #000' }, row.homeworkId);
      }
    },
    {
      title: '名称',
      key: 'title',
      minWidth: 250,
      render(row: any) {
        return h(
          'a',
          {
            href: `/homework/${row.homeworkId}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
            onClick: (e: Event) => {
              e.preventDefault();
              window.open(`/homework/${row.homeworkId}`, '_blank');
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
            h('span', { style: 'color: #333;' }, row.startTime) 
          ]),
          h('div', { style: 'display: flex; align-items: center;' }, [
            h('span', { style: 'color: #999; margin-right: 4px; width: 40px; text-align: right;' }, 'end: '),
            h('span', { style: 'color: #333;' }, row.endTime)
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
    { title: '来源', key: 'source', width: 150 },
    { 
      title: '创建者', 
      key: 'author', 
      width: 150,
      render(row: any) {
        return h('span', { style: 'color: #333' }, row.author);
      }
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
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
                onClick: () => router.push({ name: 'AdminHomeworkEdit', params: { id: row.id } })
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
                default: () => '确定删除该作业吗？'
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
    fetchHomeworks
  };
}

// --- 作业表单逻辑（添加/编辑） ---
export function useHomeworkForm() {
  const router = useRouter();
  const message = useMessage();
  const loading = ref(false);

  const formValue = reactive({
    title: '',
    source: '',
    status: true,
    timeRange: null as [number, number] | null,
    tags: [] as string[],
    description: '',
    // 学生范围
    targetClassIds: [] as string[],
    // 题目列表
    problems: [] as any[]
  });

  // 学生选择相关状态
  const studentSelectState = reactive({
    colleges: [] as OptionNode[],
    majors: [] as OptionNode[],
    classes: [] as OptionNode[],
    
    filterCollegeId: null as string | null,
    filterMajorId: null as string | null,
  });

  // 存储所有加载过的班级信息，用于回显已选班级名称
  const classMap = ref(new Map<string, string>());

  const selectedClassList = computed(() => {
    return formValue.targetClassIds.map(id => ({
      value: id,
      label: classMap.value.get(id) || id // 如果找不到名称显示ID
    }));
  });

  const handleRemoveClass = (id: string) => {
    const index = formValue.targetClassIds.indexOf(id);
    if (index > -1) {
      formValue.targetClassIds.splice(index, 1);
    }
  };

  // 题目输入
  const problemInput = ref('');

  // --- 模拟 API ---
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchColleges = async () => {
    await delay(200);
    const data = [
      { label: '计算机与信息工程学院', value: 'c1' },
      { label: '电气工程学院', value: 'c2' },
      { label: '机械工程学院', value: 'c3' },
      { label: '外国语学院', value: 'c4' },
      { label: '设计艺术学院', value: 'c5' }
    ];
    studentSelectState.colleges = data;
  };

  const fetchMajors = async (collegeId: string | null) => {
    if (!collegeId) {
      studentSelectState.majors = [];
      return;
    }
    await delay(200);
    const prefix = collegeId === 'c1' ? '计算机' : '电气'; 
    const data = [
      { label: `${prefix}专业01`, value: `${collegeId}_m1` },
      { label: `${prefix}专业02`, value: `${collegeId}_m2` },
      { label: `${prefix}专业03`, value: `${collegeId}_m3` }
    ];
    studentSelectState.majors = data;
    studentSelectState.filterMajorId = null;
  };

  const fetchClasses = async (majorId: string | null) => {
    if (!majorId) {
      studentSelectState.classes = [];
      return;
    }
    await delay(200);
    const data = Array.from({ length: 15 }).map((_, i) => ({
      label: `22级${i + 1}班`,
      value: `${majorId}_cl${i}`
    }));
    studentSelectState.classes = data;
    
    // 更新 classMap
    data.forEach(c => {
      classMap.value.set(c.value, c.label);
    });
  };

  // --- 题目操作 ---
  const handleAddProblem = () => {
    if (!problemInput.value) return;
    
    loading.value = true;
    console.log('API Request: GET /api/admin/problem/check', { pid: problemInput.value });
    
    // Mock check
    setTimeout(() => {
      const exists = Math.random() > 0.1; 
      if (exists) {
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

  // --- 提交 ---
  const handleSubmit = (isEdit: boolean, id?: string) => {
    if (!formValue.title) {
      message.warning('请输入作业名称');
      return;
    }
    if (!formValue.timeRange) {
      message.warning('请选择作业时间');
      return;
    }
    if (formValue.targetClassIds.length === 0) {
      message.warning('请至少选择一个班级');
      return;
    }
    
    loading.value = true;
    const api = isEdit ? `/api/admin/homework/${id}` : '/api/admin/homework';
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
      router.push({ name: 'AdminHomeworkList' });
    }, 500);
  };

  // --- 加载数据 (编辑模式) ---
  const loadData = (id: string) => {
    loading.value = true;
    console.log(`API Request: GET /api/admin/homework/${id}`);
    
    setTimeout(() => {
      const now = Date.now();
      formValue.title = `数据结构作业 ${id}`;
      formValue.source = '计算机学院';
      formValue.status = true;
      formValue.timeRange = [now, now + 3600 * 1000 * 48];
      formValue.tags = ['数据结构', '链表'];
      formValue.description = '# 作业描述\n\n完成以下题目。';
      formValue.targetClassIds = ['c1_m1_cl0', 'c1_m1_cl1']; // Mock selected classes
      formValue.problems = [
        { id: 1, problemId: '1001', title: 'A+B Problem', difficulty: 'Low' },
        { id: 2, problemId: '1002', title: 'Matrix', difficulty: 'Mid' }
      ];
      
      // 模拟回显班级名称
      classMap.value.set('c1_m1_cl0', '22级1班');
      classMap.value.set('c1_m1_cl1', '22级2班');

      // 为了回显，可能需要预加载一些学院/专业数据，这里简化处理，假设用户重新选择或只显示ID
      // 在实际应用中，可能需要根据 selectedClassIds 反推并加载选项，或者后端直接返回详细信息
      fetchColleges(); 

      loading.value = false;
    }, 500);
  };

  return {
    formValue,
    studentSelectState,
    selectedClassList,
    problemInput,
    loading,
    fetchColleges,
    fetchMajors,
    fetchClasses,
    handleRemoveClass,
    handleAddProblem,
    handleRemoveProblem,
    handleMoveUp,
    handleMoveDown,
    handleSubmit,
    loadData
  };
}
