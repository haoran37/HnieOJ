import { ref, reactive, h } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag, NSpace, NSelect, useMessage, NPopconfirm } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import {
  deleteAdminProblem,
  getAdminProblemList,
  updateAdminProblemAuth,
  type AdminProblemListVo,
} from '@/utils/api';

const DIFFICULTY_LABELS: Record<number, { text: string; type: 'success' | 'warning' | 'error' | 'default' }> = {
  0: { text: '简单', type: 'success' },
  1: { text: '中等', type: 'warning' },
  2: { text: '困难', type: 'error' },
};

const AUTH_OPTIONS = [
  { label: '公开', value: 1 },
  { label: '私有', value: 2 },
  // 后端 PUT /api/admin/problem/auth 仅支持 1/2，赛用(3)需在编辑页调整
  { label: '赛用（仅编辑页可改）', value: 3, disabled: true },
];

export function useProblemManage() {
  const router = useRouter();
  const message = useMessage();

  const loading = ref(false);
  const searchKeyword = ref('');
  const authFilter = ref<number | null>(null);
  const tableData = ref<AdminProblemListVo[]>([]);

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  // 列表请求序号：筛选/翻页快速变化时，只接受最后一次响应，旧响应不得覆盖新状态
  let fetchSeq = 0;

  const fetchProblems = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const data = await getAdminProblemList({
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: searchKeyword.value,
        auth: authFilter.value,
      });
      if (seq !== fetchSeq) return;
      tableData.value = data.list ?? [];
      pagination.itemCount = data.total ?? 0;
    } catch (error) {
      if (seq !== fetchSeq) return;
      tableData.value = [];
      pagination.itemCount = 0;
      message.error(error instanceof Error ? error.message : '题目列表加载失败');
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchProblems();
  };

  const handleReset = () => {
    searchKeyword.value = '';
    authFilter.value = null;
    pagination.page = 1;
    fetchProblems();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchProblems();
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    fetchProblems();
  };

  const handleDelete = async (row: AdminProblemListVo) => {
    try {
      await deleteAdminProblem(row.id);
      message.success(`已删除题目 ${row.problemCode}`);
      // 删除后回到第一页重新读取，避免当前页残留/空页
      pagination.page = 1;
      await fetchProblems();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除题目失败');
    }
  };

  // 可见范围切换：按行做 in-flight 保护，连续切换时不重复发请求、旧响应不覆盖新状态
  const authUpdatingIds = ref<Set<number>>(new Set());

  const markAuthUpdating = (id: number, updating: boolean) => {
    const next = new Set(authUpdatingIds.value);
    if (updating) next.add(id);
    else next.delete(id);
    authUpdatingIds.value = next;
  };

  const handleAuthChange = async (row: AdminProblemListVo, auth: number) => {
    if (authUpdatingIds.value.has(row.id)) return;
    const previous = row.auth ?? 1;
    if (auth === previous) return;
    markAuthUpdating(row.id, true);
    try {
      await updateAdminProblemAuth(row.id, auth);
      row.auth = auth;
      message.success('可见范围已更新');
    } catch (error) {
      // 失败时不伪造成功：回退展示值并重读列表（同值赋值不触发更新，无法仅靠赋值还原控件）
      row.auth = previous;
      message.error(error instanceof Error ? error.message : '可见范围更新失败');
      await fetchProblems();
    } finally {
      markAuthUpdating(row.id, false);
    }
  };

  const columns = [
    {
      title: 'PID',
      key: 'problemCode',
      width: 140,
      render(row: AdminProblemListVo) {
        return h(
          'a',
          {
            href: `/problem/${row.problemCode}`,
            target: '_blank',
            style: 'color: #007BFF; text-decoration: none;'
          },
          row.problemCode
        );
      }
    },
    { title: '标题', key: 'title', minWidth: 200 },
    { title: '创建者', key: 'author', width: 120, render: (row: AdminProblemListVo) => row.author ?? '-' },
    {
      title: '难度',
      key: 'difficulty',
      width: 90,
      render(row: AdminProblemListVo) {
        const config = row.difficulty === null || row.difficulty === undefined
          ? { text: '未评级', type: 'default' as const }
          : DIFFICULTY_LABELS[row.difficulty] ?? { text: '未评级', type: 'default' as const };
        return h(NTag, { type: config.type, size: 'small' }, { default: () => config.text });
      }
    },
    {
      title: '类型',
      key: 'type',
      width: 90,
      render(row: AdminProblemListVo) {
        const isOi = row.type === 1;
        return h(NTag, { type: isOi ? 'warning' : 'info', size: 'small' }, { default: () => (isOi ? 'OI' : 'ACM') });
      }
    },
    {
      title: '标签',
      key: 'tags',
      minWidth: 160,
      render(row: AdminProblemListVo) {
        const tags = row.tags ?? [];
        if (tags.length === 0) return '-';
        return h(NSpace, { size: 4 }, {
          default: () => tags.map((tag) => h(NTag, { size: 'small', bordered: false }, { default: () => tag }))
        });
      }
    },
    {
      title: '可见范围',
      key: 'auth',
      width: 190,
      render(row: AdminProblemListVo) {
        return h(NSelect, {
          size: 'small',
          value: row.auth ?? 1,
          options: AUTH_OPTIONS,
          consistentMenuWidth: false,
          disabled: authUpdatingIds.value.has(row.id),
          onUpdateValue: (value: number) => handleAuthChange(row, value),
        });
      }
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 180,
      render: (row: AdminProblemListVo) => formatFullTime(row.createTime)
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render(row: AdminProblemListVo) {
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
                default: () => `确定删除题目 ${row.problemCode} 吗？`
              }
            )
          ]
        });
      }
    }
  ];

  // 初始化时加载第一页
  void fetchProblems();

  return {
    loading,
    searchKeyword,
    authFilter,
    tableData,
    pagination,
    columns,
    fetchProblems,
    handleSearch,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
    handleDelete,
    handleAuthChange,
  };
}
