import { ref, reactive, h, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, useMessage, NPopconfirm } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime'

export function useProblemManage() {
  const router = useRouter();
  const message = useMessage();

  const showImportModal = ref(false);
  const showExportModal = ref(false);
  const showRemoteModal = ref(false);
  const searchKeyword = ref('');
  const loading = ref(false);

  // 模拟数据
  const tableData = ref<any[]>([]);

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
      fetchProblems();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      fetchProblems();
    }
  });

  const fetchProblems = () => {
    loading.value = true;
    console.log('API Request: GET /api/admin/problem/list', {
      page: pagination.page,
      limit: pagination.pageSize,
      keyword: searchKeyword.value
    });

    // 模拟 API 延迟
    setTimeout(() => {
      const mockData = Array.from({ length: pagination.pageSize }, (_, i) => {
        const id = (pagination.page - 1) * pagination.pageSize + i + 1;
        const types = ['default', 'spj', 'interactive', 'remote'];
        const auths = [1, 2, 3];
        return {
          id: id,
          problemId: `100${id}`,
          title: `Problem ${id}`,
          author: 'admin',
          createTime: formatFullTime('2023-01-01 12:00:00'),
          type: types[i % 4],
          auth: auths[i % 3]
        };
      });
      
      tableData.value = mockData;
      pagination.itemCount = 100; // 假设总共有100条数据
      loading.value = false;
    }, 500);
  };

  // 初始化加载
  fetchProblems();

  const handleSearch = () => {
    pagination.page = 1;
    fetchProblems();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchProblems();
  };

  const handleDelete = (row: any) => {
    console.log('API Request: DELETE /api/admin/problem', { id: row.id });
    message.success(`删除题目 ${row.title} 成功`);
    fetchProblems();
  };

  const handleExportSingle = (row: any) => {
    console.log('API Request: POST /api/admin/problem/export', { ids: [row.id] });
    message.success(`导出题目 ${row.title}`);
  };

  const columns = [
    {
      title: 'PID',
      key: 'problemId',
      width: 100,
      render(row: any) {
        return h(
          'a',
          {
            href: `/problem/${row.problemId}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none;'
          },
          row.problemId
        );
      }
    },
    { title: '标题', key: 'title', minWidth: 200 },
    { title: '创建者', key: 'author', width: 120 },
    { title: '创建时间', key: 'createTime', width: 180 },
    {
      title: '类型',
      key: 'type',
      width: 120,
      render(row: any) {
        const typeMap: Record<string, { text: string; type: 'info' | 'warning' | 'success' | 'error' | 'default' }> = {
          default: { text: '普通判题', type: 'info' },
          spj: { text: '特殊判题', type: 'warning' },
          interactive: { text: '交互判题', type: 'success' },
          remote: { text: '远程判题', type: 'error' }
        };
        const config = typeMap[row.type] || { text: row.type, type: 'default' };
        return h(NTag, { type: config.type, size: 'small' }, { default: () => config.text });
      }
    },
    {
      title: '状态',
      key: 'auth',
      width: 100,
      render(row: any) {
        const statusMap: Record<number, { text: string; type: 'success' | 'warning' | 'error' | 'default' }> = {
          1: { text: '公开', type: 'success' },
          2: { text: '私有', type: 'warning' },
          3: { text: '赛用', type: 'error' }
        };
        const status = statusMap[row.auth] || { text: '未知', type: 'default' };
        return h(NTag, { type: status.type, size: 'small' }, { default: () => status.text });
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
                onClick: () => router.push({ name: 'AdminProblemEdit', params: { id: row.id } })
              },
              { default: () => '编辑' }
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'warning',
                onClick: () => handleExportSingle(row)
              },
              { default: () => '导出' }
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
                default: () => '确定删除该题目吗？'
              }
            )
          ]
        });
      }
    }
  ];

  // 导出相关
  const exportSearchKeyword = ref('');
  const exportTableData = ref<any[]>([]); 
  const exportColumns = [
    { type: 'selection' },
    { title: 'PID', key: 'problemId' },
    { title: '标题', key: 'title' }
  ];
  const selectedExportRows = ref([]);

  // 监听导出模态框打开，自动加载数据
  watch(showExportModal, (val) => {
    if (val) {
      exportSearchKeyword.value = '';
      exportTableData.value = tableData.value; // 初始显示当前页数据，或者调用 API 获取
    }
  });

  const handleExportSearch = () => {
    console.log('API Request: GET /api/admin/problem/list (Export)', {
      keyword: exportSearchKeyword.value
    });
    // 模拟搜索结果
    exportTableData.value = tableData.value; 
  };

  const handleExportSelection = (keys: any) => {
    selectedExportRows.value = keys;
  };

  const handleExport = () => {
    if (selectedExportRows.value.length === 0) {
      message.warning('请选择要导出的题目');
      return;
    }
    console.log('API Request: POST /api/admin/problem/export', { ids: selectedExportRows.value });
    message.success(`导出 ${selectedExportRows.value.length} 个题目`);
    showExportModal.value = false;
  };

  // 远程OJ相关
  const remoteOJ = ref(null);
  const remoteProblemId = ref('');
  const remoteOJOptions = [
    { label: 'HDU', value: 'HDU' },
    { label: 'Codeforces', value: 'Codeforces' },
    { label: 'POJ', value: 'POJ' },
    { label: 'GYM', value: 'GYM' },
    { label: 'AtCoder', value: 'AtCoder' },
    { label: 'SPOJ', value: 'SPOJ' },
    { label: 'Libre', value: 'Libre' }
  ];

  const handleAddRemoteProblem = () => {
    if (!remoteOJ.value || !remoteProblemId.value) {
      message.warning('请填写完整信息');
      return;
    }
    console.log('API Request: POST /api/admin/problem/remote', {
      oj: remoteOJ.value,
      problemId: remoteProblemId.value
    });
    message.success(`添加远程题目 ${remoteOJ.value}-${remoteProblemId.value}`);
    showRemoteModal.value = false;
    fetchProblems();
  };

  return {
    showImportModal,
    showExportModal,
    showRemoteModal,
    searchKeyword,
    loading,
    tableData,
    pagination,
    columns,
    handleSearch,
    handlePageChange,
    exportSearchKeyword,
    exportTableData,
    exportColumns,
    handleExportSearch,
    handleExportSelection,
    handleExport,
    remoteOJ,
    remoteProblemId,
    remoteOJOptions,
    handleAddRemoteProblem
  };
}
