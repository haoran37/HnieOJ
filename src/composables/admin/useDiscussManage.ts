import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';
import {
  deleteAdminDiscussion,
  getAdminDiscussionDetail,
  getAdminDiscussions,
  updateAdminDiscussion,
  type AdminDiscussionListVo,
} from '@/utils/api';

export type { AdminDiscussionListVo as DiscussItem };

export function useDiscussManage() {
  const message = useMessage();

  const loading = ref(false);
  const discussList = ref<AdminDiscussionListVo[]>([]);

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  const searchForm = reactive({
    keyword: '',
    category: null as string | null,
    status: null as number | null,
  });

  // 列表请求序号：筛选/翻页快速变化时只接受最后一次响应
  let fetchSeq = 0;

  const fetchDiscussList = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const data = await getAdminDiscussions({
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword,
        category: searchForm.category,
        status: searchForm.status,
      });
      if (seq !== fetchSeq) return;
      discussList.value = data.list ?? [];
      pagination.itemCount = data.total ?? 0;
    } catch (error) {
      if (seq !== fetchSeq) return;
      discussList.value = [];
      pagination.itemCount = 0;
      message.error(error instanceof Error ? error.message : '讨论列表加载失败');
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchDiscussList();
  };

  const handleReset = () => {
    searchForm.keyword = '';
    searchForm.category = null;
    searchForm.status = null;
    pagination.page = 1;
    fetchDiscussList();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchDiscussList();
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    fetchDiscussList();
  };

  // --- 编辑模态框 ---
  const showEditModal = ref(false);
  const editLoading = ref(false);

  const editForm = reactive({
    id: 0,
    title: '',
    category: 'Problem' as string,
    problemCode: '',
    status: 0,
    isTop: false,
    content: '',
  });

  // 管理端详情读取序号：只允许最后一次选择的讨论写入编辑表单
  let detailSeq = 0;

  // 已关闭讨论公开详情读不到 content；改用受保护管理端详情，读取失败时才不打开编辑框（不伪造内容）
  const openEditModal = async (row: AdminDiscussionListVo) => {
    const seq = ++detailSeq;
    editLoading.value = true;
    try {
      const detail = await getAdminDiscussionDetail(row.id);
      if (seq !== detailSeq) return;
      editForm.id = detail.id ?? row.id;
      editForm.title = detail.title ?? row.title;
      editForm.category = detail.category ?? row.category ?? 'Problem';
      editForm.problemCode = detail.problemCode ?? row.problemCode ?? '';
      editForm.status = detail.status ?? row.status ?? 0;
      editForm.isTop = detail.isTop ?? false;
      editForm.content = detail.content ?? '';
      showEditModal.value = true;
    } catch (error) {
      if (seq !== detailSeq) return;
      message.error(error instanceof Error ? error.message : '无法读取讨论内容，请稍后重试');
    } finally {
      if (seq === detailSeq) editLoading.value = false;
    }
  };

  const handleSaveEdit = async () => {
    if (editLoading.value) return;
    if (!editForm.title.trim()) {
      message.warning('请输入标题');
      return;
    }
    if (!editForm.content.trim()) {
      message.warning('请输入内容');
      return;
    }
    if (editForm.category === 'Problem' && !editForm.problemCode.trim()) {
      message.warning('题目讨论需要填写题目编号');
      return;
    }

    editLoading.value = true;
    try {
      await updateAdminDiscussion(editForm.id, {
        title: editForm.title.trim(),
        category: editForm.category,
        problemCode: editForm.category === 'Problem' ? editForm.problemCode.trim() : null,
        content: editForm.content,
        status: editForm.status,
        isTop: editForm.isTop,
      });
      message.success('讨论已保存');
      showEditModal.value = false;
      await fetchDiscussList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      editLoading.value = false;
    }
  };

  const handleDelete = async (row: AdminDiscussionListVo) => {
    try {
      await deleteAdminDiscussion(row.id);
      message.success('讨论已删除');
      pagination.page = 1;
      await fetchDiscussList();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除讨论失败');
    }
  };

  void fetchDiscussList();

  return {
    loading,
    discussList,
    pagination,
    searchForm,
    handleSearch,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
    fetchDiscussList,
    showEditModal,
    editLoading,
    editForm,
    openEditModal,
    handleSaveEdit,
    handleDelete,
  };
}
