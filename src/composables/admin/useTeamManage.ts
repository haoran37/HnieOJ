import { ref, reactive, h, watch } from 'vue';
import { NButton, NSpace, NPopconfirm, useMessage, type DataTableColumns, type FormInst } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { useRouter, useRoute } from 'vue-router';
import {
  batchDeleteAdminContestTeams,
  checkContest,
  createAdminContestTeam,
  deleteAdminContestTeam,
  getAdminContestDetail,
  getAdminContests,
  getAdminContestTeams,
  updateAdminContestTeam,
  type AdminContestTeamListVo,
} from '@/utils/api';

export type Team = AdminContestTeamListVo;

export function useTeamManage() {
  const router = useRouter();
  const route = useRoute();
  const message = useMessage();
  const loading = ref(false);
  const saving = ref(false);
  const teamList = ref<Team[]>([]);
  const checkedRowKeys = ref<Array<string | number>>([]);
  const showModal = ref(false);
  const modalType = ref<'add' | 'edit'>('add');
  const formRef = ref<FormInst | null>(null);
  const currentId = ref<number | null>(null);

  // 队伍接口必须带 cid；下拉来自真实比赛列表
  const contestOptions = ref<Array<{ label: string; value: number }>>([]);
  const selectedCid = ref<number | null>(null);
  const contestLoading = ref(false);

  const formValue = reactive({
    name: '',
    member1Uid: '',
    member2Uid: '',
    member3Uid: '',
  });

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  let fetchSeq = 0;
  // 比赛切换代际：旧 checkContest/fetchTeams 响应不得回填或清空当前比赛的列表
  let cidSeq = 0;
  // 比赛下拉搜索代际：快速输入时旧结果不得覆盖新结果
  let contestSeq = 0;
  // 弹窗/保存代际：切换比赛、关闭弹窗、卸载时作废在途保存，避免旧回调操作新弹窗
  let modalSeq = 0;

  const closeModal = () => {
    modalSeq += 1;
    showModal.value = false;
    saving.value = false;
  };

  // 路由卸载或外部作废：丢弃在途查验、列表请求与保存
  const invalidate = () => {
    modalSeq += 1;
    cidSeq += 1;
    fetchSeq += 1;
    contestSeq += 1;
    saving.value = false;
    loading.value = false;
    contestLoading.value = false;
  };

  // 任何关闭方式（遮罩、Esc、直接改 showModal）都要作废在途校验/保存，
  // 不能只依赖 closeModal；否则延迟的 validate 回调可能在关闭后仍发起 POST
  watch(showModal, (open) => {
    if (!open) {
      modalSeq += 1;
      saving.value = false;
    }
  });

  const fetchTeams = async () => {
    if (!selectedCid.value) {
      teamList.value = [];
      pagination.itemCount = 0;
      return;
    }
    const cid = selectedCid.value;
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const data = await getAdminContestTeams(cid, pagination.page, pagination.pageSize);
      if (seq !== fetchSeq || selectedCid.value !== cid) return;
      teamList.value = data?.list ?? [];
      pagination.itemCount = data?.total ?? 0;
    } catch (error) {
      if (seq !== fetchSeq || selectedCid.value !== cid) return;
      teamList.value = [];
      pagination.itemCount = 0;
      message.error(error instanceof Error ? error.message : '队伍列表加载失败');
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  /** 指定比赛不在当前页/搜索结果时，用管理详情补齐下拉选项（老比赛也可访问） */
  const withContestOption = async (
    cid: number,
    options: Array<{ label: string; value: number }>,
  ): Promise<Array<{ label: string; value: number }>> => {
    try {
      const detail = await getAdminContestDetail(cid);
      if (detail?.id) {
        return [{ label: detail.title, value: detail.id }, ...options];
      }
    } catch {
      // 指定比赛不存在或不可读时保留下拉原状
    }
    return options;
  };

  const fetchContestOptions = async (keyword = '', applyQuerySelection = true) => {
    const seq = ++contestSeq;
    contestLoading.value = true;
    try {
      const data = await getAdminContests({
        page: 1,
        pageSize: 50,
        keyword: keyword.trim() || undefined,
      });
      if (seq !== contestSeq) return;
      let options = (data?.list ?? []).map((item) => ({ label: item.title, value: item.id }));
      const queryCid = Number(route.query?.cid);
      if (applyQuerySelection && queryCid && !options.some((item) => item.value === queryCid)) {
        // 指定比赛可能不在当前页中，用管理详情补齐，避免老比赛无法选择
        options = await withContestOption(queryCid, options);
        if (seq !== contestSeq) return;
      }
      // 保留当前已选比赛，避免远程搜索时下拉值丢失
      if (selectedCid.value && !options.some((item) => item.value === selectedCid.value)) {
        const current = contestOptions.value.find((item) => item.value === selectedCid.value);
        if (current) options = [current, ...options];
      }
      contestOptions.value = options;
      if (applyQuerySelection) {
        const validQueryCid = queryCid && options.some((item) => item.value === queryCid) ? queryCid : null;
        if (validQueryCid) {
          selectedCid.value = validQueryCid;
        } else if (selectedCid.value === null && options.length > 0) {
          selectedCid.value = options[0]!.value;
        }
      }
    } catch (error) {
      if (seq !== contestSeq) return;
      message.error(error instanceof Error ? error.message : '比赛列表加载失败');
    } finally {
      if (seq === contestSeq) contestLoading.value = false;
    }
  };

  // 下拉远程搜索：不改变当前已选比赛
  const handleContestSearch = (keyword: string) => {
    void fetchContestOptions(keyword, false);
  };

  const handleCidChange = (cid: number) => {
    const seq = ++cidSeq;
    // 立即作废在途队伍列表请求，避免 A→B→A 时旧 A 列表回填并清掉 loading
    fetchSeq += 1;
    selectedCid.value = cid;
    pagination.page = 1;
    checkedRowKeys.value = [];
    closeModal();
    teamList.value = [];
    pagination.itemCount = 0;
    if (!cid) {
      loading.value = false;
      return;
    }
    loading.value = true;
    // 切换比赛时用真实接口查验比赛存在性，避免对已删除比赛发队伍请求
    void (async () => {
      try {
        const info = await checkContest(cid);
        if (seq !== cidSeq) return;
        // 公开 check 只暴露可见比赛：已停用/不可见的比赛管理员仍可管理，
        // 回退到受保护的管理详情确认存在性与权限，只有确实不可访问才停止
        let usable = !!info?.valid;
        if (!usable) {
          try {
            const detail = await getAdminContestDetail(cid);
            if (seq !== cidSeq) return;
            usable = !!detail?.id;
          } catch {
            if (seq !== cidSeq) return;
            usable = false;
          }
        }
        if (!usable) {
          teamList.value = [];
          pagination.itemCount = 0;
          message.warning('所选比赛不存在或不可访问');
          return;
        }
        await fetchTeams();
      } catch (error) {
        if (seq !== cidSeq) return;
        teamList.value = [];
        pagination.itemCount = 0;
        message.error(error instanceof Error ? error.message : '比赛查验失败，请重试');
      } finally {
        if (seq === cidSeq) loading.value = false;
      }
    })();
  };

  const init = async () => {
    await fetchContestOptions();
    await fetchTeams();
  };

  const handleAdd = () => {
    modalSeq += 1;
    modalType.value = 'add';
    formValue.name = '';
    formValue.member1Uid = '';
    formValue.member2Uid = '';
    formValue.member3Uid = '';
    currentId.value = null;
    saving.value = false;
    showModal.value = true;
  };

  const handleEdit = (row: Team) => {
    modalSeq += 1;
    modalType.value = 'edit';
    formValue.name = row.name;
    formValue.member1Uid = row.member1Uid ?? '';
    formValue.member2Uid = row.member2Uid ?? '';
    formValue.member3Uid = row.member3Uid ?? '';
    currentId.value = row.id;
    saving.value = false;
    showModal.value = true;
  };

  const handleDelete = async (row: Team) => {
    try {
      await deleteAdminContestTeam(row.id);
      message.success('队伍已删除');
      pagination.page = 1;
      await fetchTeams();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除队伍失败');
    }
  };

  const handleBatchDelete = async () => {
    if (checkedRowKeys.value.length === 0) return;
    try {
      await batchDeleteAdminContestTeams(checkedRowKeys.value as number[]);
      message.success('已删除选中的队伍');
      checkedRowKeys.value = [];
      pagination.page = 1;
      await fetchTeams();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量删除失败');
    }
  };

  const handleSubmit = () => {
    if (saving.value) return;
    if (!selectedCid.value) {
      message.warning('请先选择比赛');
      return;
    }
    const form = formRef.value;
    if (!form) return;
    // 提交时快照当前弹窗/记录/比赛：结束后代际不匹配则视为已作废
    const submitSeq = modalSeq;
    const submitType = modalType.value;
    const submitId = currentId.value;
    const submitCid = selectedCid.value;
    saving.value = true;
    // NaiveUI 即使传入回调，校验失败时返回的 Promise 仍会 reject，必须吞掉该 rejection，
    // 校验错误已通过回调处理，避免未处理的 Promise 异常
    const validation = form.validate((errors) => {
      // 关闭弹窗（含遮罩/Esc 直接改 showModal）或切换比赛后不得再提交
      if (submitSeq !== modalSeq || !showModal.value) return;
      if (errors) {
        saving.value = false;
        return;
      }
      const members = [formValue.member1Uid, formValue.member2Uid, formValue.member3Uid]
        .map((uid) => uid.trim())
        .filter(Boolean);
      if (new Set(members).size !== members.length) {
        saving.value = false;
        message.warning('队伍成员 UID 不能重复');
        return;
      }
      const payload = {
        cid: submitCid,
        name: formValue.name.trim(),
        member1Uid: formValue.member1Uid.trim(),
        member2Uid: formValue.member2Uid.trim() || null,
        member3Uid: formValue.member3Uid.trim() || null,
      };
      const request =
        submitType === 'add'
          ? createAdminContestTeam(payload)
          : updateAdminContestTeam(submitId as number, payload);
      request
        .then(() => {
          if (submitSeq !== modalSeq || !showModal.value) return;
          message.success(submitType === 'add' ? '队伍已创建' : '队伍已保存');
          showModal.value = false;
          return fetchTeams();
        })
        .catch((error: unknown) => {
          if (submitSeq !== modalSeq || !showModal.value) return;
          message.error(error instanceof Error ? error.message : '保存队伍失败');
        })
        .finally(() => {
          if (submitSeq === modalSeq) saving.value = false;
        });
    });
    if (validation && typeof validation.catch === 'function') {
      validation.catch(() => {});
    }
  };

  const handleCheck = (rowKeys: Array<string | number>) => {
    checkedRowKeys.value = rowKeys;
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    void fetchTeams();
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    void fetchTeams();
  };

  const createUidLink = (uid: string | null) => {
    if (!uid) return '-';
    return h(
      'a',
      {
        href: `/user/${uid}`,
        target: '_blank',
        style: 'color: #007BFF; text-decoration: none; cursor: pointer;',
        onClick: (e: Event) => {
          e.preventDefault();
          router.push(`/user/${uid}`);
        },
      },
      uid,
    );
  };

  const columns: DataTableColumns<Team> = [
    {
      type: 'selection',
    },
    {
      title: 'ID',
      key: 'id',
      width: 80,
      render(row) {
        return h('span', String(row.id));
      },
    },
    {
      title: '队伍名称',
      key: 'name',
      width: 160,
      ellipsis: { tooltip: true },
    },
    {
      title: '成员1 UID (队长)',
      key: 'member1Uid',
      width: 140,
      render(row) {
        return createUidLink(row.member1Uid);
      },
    },
    {
      title: '成员1 姓名',
      key: 'member1Name',
      width: 110,
    },
    {
      title: '成员2 UID',
      key: 'member2Uid',
      width: 130,
      render(row) {
        return createUidLink(row.member2Uid);
      },
    },
    {
      title: '成员2 姓名',
      key: 'member2Name',
      width: 110,
    },
    {
      title: '成员3 UID',
      key: 'member3Uid',
      width: 130,
      render(row) {
        return createUidLink(row.member3Uid);
      },
    },
    {
      title: '成员3 姓名',
      key: 'member3Name',
      width: 110,
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 180,
      render(row) {
        return formatFullTime(row.createTime);
      },
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
                onClick: () => handleEdit(row),
              },
              { default: () => '编辑' },
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row),
              },
              {
                trigger: () =>
                  h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
                default: () => '确定删除该队伍吗？',
              },
            ),
          ],
        });
      },
    },
  ];

  return {
    loading,
    saving,
    teamList,
    pagination,
    columns,
    checkedRowKeys,
    showModal,
    modalType,
    formValue,
    formRef,
    contestOptions,
    contestLoading,
    selectedCid,
    init,
    fetchTeams,
    fetchContestOptions,
    handleContestSearch,
    handleCidChange,
    handleAdd,
    handleEdit,
    closeModal,
    invalidate,
    handleBatchDelete,
    handleSubmit,
    handleCheck,
    handlePageChange,
    handlePageSizeChange,
  };
}
