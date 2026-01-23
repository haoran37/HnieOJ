import { ref, reactive, h } from 'vue';
import { NButton, NSpace, NPopconfirm, useMessage, type DataTableColumns, type FormInst } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { useRouter } from 'vue-router'

export interface Team {
  id: number;
  name: string;
  member1Uid: string;
  member1Name: string;
  member2Uid: string;
  member2Name: string;
  member3Uid: string;
  member3Name: string;
  createTime: string;
}

export function useTeamManage() {
  const router = useRouter();
  const message = useMessage();
  const loading = ref(false);
  const teamList = ref<Team[]>([]);
  const checkedRowKeys = ref<Array<string | number>>([]);
  const showModal = ref(false);
  const modalType = ref<'add' | 'edit'>('add');
  const formRef = ref<FormInst | null>(null);
  const currentId = ref<number | null>(null);

  const formValue = reactive({
    name: '',
    member1Uid: '',
    member2Uid: '',
    member3Uid: ''
  });

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
      pagination.page = page;
      fetchTeams();
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      fetchTeams();
    }
  });

  const fetchTeams = () => {
    loading.value = true;
    console.log('API Request: GET /api/admin/contest/team', {
      page: pagination.page,
      limit: pagination.pageSize
    });

    // Mock Data
    setTimeout(() => {
      const mockData = Array.from({ length: pagination.pageSize }, (_, i) => {
        const id = (pagination.page - 1) * pagination.pageSize + i + 1;
        return {
          id: id,
          name: `Team ${id} - WA Pool`,
          member1Uid: `20220000000${id}`,
          member1Name: `张三${id}`,
          member2Uid: `20220100000${id}`,
          member2Name: `李四${id}`,
          member3Uid: `20220200000${id}`,
          member3Name: `王五${id}`,
          createTime: formatFullTime(new Date())
        };
      });
      teamList.value = mockData;
      pagination.itemCount = 100;
      loading.value = false;
    }, 500);
  };

  const handleAdd = () => {
    modalType.value = 'add';
    formValue.name = '';
    formValue.member1Uid = '';
    formValue.member2Uid = '';
    formValue.member3Uid = '';
    currentId.value = null;
    showModal.value = true;
  };

  const handleEdit = (row: Team) => {
    modalType.value = 'edit';
    formValue.name = row.name;
    formValue.member1Uid = row.member1Uid;
    formValue.member2Uid = row.member2Uid;
    formValue.member3Uid = row.member3Uid;
    currentId.value = row.id;
    showModal.value = true;
  };

  const handleDelete = (row: Team) => {
    console.log(`API Request: DELETE /api/admin/contest/team/${row.id}`);
    message.success(`删除队伍 ${row.name} 成功`);
    fetchTeams();
  };

  const handleBatchDelete = () => {
    if (checkedRowKeys.value.length === 0) return;
    console.log('API Request: DELETE /api/admin/contest/team', { ids: checkedRowKeys.value });
    message.success(`批量删除 ${checkedRowKeys.value.length} 个队伍成功`);
    checkedRowKeys.value = [];
    fetchTeams();
  };

  const handleSubmit = () => {
    formRef.value?.validate((errors) => {
      if (!errors) {
        loading.value = true;
        if (modalType.value === 'add') {
          console.log('API Request: POST /api/admin/contest/team', formValue);
          message.success('添加队伍成功');
        } else {
          console.log(`API Request: PUT /api/admin/contest/team/${currentId.value}`, formValue);
          message.success('更新队伍成功');
        }
        
        setTimeout(() => {
          loading.value = false;
          showModal.value = false;
          fetchTeams();
        }, 500);
      }
    });
  };

  const handleCheck = (rowKeys: Array<string | number>) => {
    checkedRowKeys.value = rowKeys;
  };

  const createUidLink = (uid: string) => {
    if (!uid) return '-';
    return h(
      'a',
      {
        href: `/user/${uid}`,
        target: '_blank',
        style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
        onClick: (e: Event) => {
          e.preventDefault();
          router.push(`/user/${uid}`)
        }
      },
      uid
    );
  };

  const columns: DataTableColumns<Team> = [
    {
      type: 'selection'
    },
    {
      title: 'ID',
      key: 'id',
      width: 80,
      render(row) {
        return h('span', row.id);
      }
    },
    {
      title: '队伍名称',
      key: 'name',
      width: 150,
      ellipsis: {
        tooltip: true
      }
    },
    {
      title: '成员1 UID (队长)',
      key: 'member1Uid',
      width: 120,
      render(row) {
        return createUidLink(row.member1Uid);
      }
    },
    {
      title: '成员1 姓名',
      key: 'member1Name',
      width: 100
    },
    {
      title: '成员2 UID',
      key: 'member2Uid',
      width: 120,
      render(row) {
        return createUidLink(row.member2Uid);
      }
    },
    {
      title: '成员2 姓名',
      key: 'member2Name',
      width: 100
    },
    {
      title: '成员3 UID',
      key: 'member3Uid',
      width: 120,
      render(row) {
        return createUidLink(row.member3Uid);
      }
    },
    {
      title: '成员3 姓名',
      key: 'member3Name',
      width: 100
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 180
    },
    {
      title: '操作',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render(row) {
        return h(NSpace, {}, {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => handleEdit(row)
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
                default: () => '确定删除该队伍吗？'
              }
            )
          ]
        });
      }
    }
  ];

  return {
    loading,
    teamList,
    pagination,
    columns,
    checkedRowKeys,
    showModal,
    modalType,
    formValue,
    formRef,
    fetchTeams,
    handleAdd,
    handleBatchDelete,
    handleSubmit,
    handleCheck
  };
}
