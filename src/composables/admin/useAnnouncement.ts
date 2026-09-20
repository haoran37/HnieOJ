import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAnnouncementDetail,
  getAdminAnnouncements,
  updateAdminAnnouncement,
  updateAdminAnnouncementStatus,
  type AdminAnnouncementListVo,
  type AnnouncementCategory,
} from '@/utils/api';

export type { AdminAnnouncementListVo as GeneralAnnouncement };

/**
 * 后台公告/新闻 CRUD（复用同一套 /api/admin/announcements 业务）。
 *
 * - category 默认 ANNOUNCEMENT（普通公告）；新闻管理传 NEWS；
 * - 列表/保存都带对应 category；
 * - 编辑前用受保护管理端详情读取真实内容（下线也可读），不先上线再读取；
 * - 加载失败保留错误并由页面提供重试，不伪装成空列表。
 */
export function useAnnouncement(category: AnnouncementCategory = 'ANNOUNCEMENT') {
  const message = useMessage();

  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const showModal = ref(false);
  const modalMode = ref<'create' | 'edit'>('create');

  const announcements = ref<AdminAnnouncementListVo[]>([]);

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  const searchForm = reactive({
    keyword: '',
    status: null as number | null,
  });

  const formModel = reactive({
    id: 0,
    title: '',
    content: '',
    status: 1,
    category: category as string,
  });

  let fetchSeq = 0;

  const fetchAnnouncements = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    error.value = null;
    try {
      const data = await getAdminAnnouncements({
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword,
        status: searchForm.status,
        category,
      });
      if (seq !== fetchSeq) return;
      announcements.value = data.list ?? [];
      pagination.itemCount = data.total ?? 0;
    } catch (err) {
      if (seq !== fetchSeq) return;
      const msg = err instanceof Error ? err.message : '列表加载失败';
      announcements.value = [];
      pagination.itemCount = 0;
      error.value = msg;
      message.error(msg);
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    fetchAnnouncements();
  };

  const handleReset = () => {
    searchForm.keyword = '';
    searchForm.status = null;
    pagination.page = 1;
    fetchAnnouncements();
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
    fetchAnnouncements();
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    fetchAnnouncements();
  };

  // 管理端详情读取序号：只允许最后一次打开/选择写入编辑表单
  let detailSeq = 0;

  const openCreateModal = () => {
    // 保存进行中禁止切换到新建，避免在途请求结果写入新记录
    if (saving.value) return;
    // 作废仍在途的编辑详情读取，避免旧响应在新建表单里回填旧记录
    detailSeq += 1;
    modalMode.value = 'create';
    formModel.id = 0;
    formModel.title = '';
    formModel.content = '';
    formModel.status = 1;
    formModel.category = category;
    showModal.value = true;
  };

  const openEditModal = async (row: AdminAnnouncementListVo) => {
    // 保存进行中禁止切换到编辑其它记录
    if (saving.value) return;
    // 管理端列表不返回 content，编辑前用受保护详情读取真实内容（上线/下线都可读）
    const seq = ++detailSeq;
    try {
      const detail = await getAdminAnnouncementDetail(row.id);
      if (seq !== detailSeq) return;
      modalMode.value = 'edit';
      formModel.id = detail.id ?? row.id;
      formModel.title = detail.title ?? row.title;
      formModel.content = detail.content ?? '';
      formModel.status = detail.status ?? row.status ?? 0;
      formModel.category = detail.category ?? row.category ?? category;
      showModal.value = true;
    } catch (err) {
      if (seq !== detailSeq) return;
      message.error(err instanceof Error ? err.message : '无法读取内容，请稍后重试');
    }
  };

  // 正常关闭：保存期间必须被忽略，避免在途保存结果关掉后切换记录
  const closeModal = () => {
    if (saving.value) return;
    showModal.value = false;
  };

  // Naive UI 右上关闭与 Esc 都走 update:show，保存期间必须被忽略
  const handleModalShowChange = (value: boolean) => {
    if (value) {
      showModal.value = true;
      return;
    }
    closeModal();
  };

  const handleSubmit = async () => {
    if (saving.value) return;
    if (!formModel.title.trim()) {
      message.warning('请输入标题');
      return;
    }
    if (!formModel.content.trim()) {
      message.warning('请输入内容');
      return;
    }

    // 保存期间捕获 id 与 payload 快照，避免切换记录后把结果写到别的记录上
    const mode = modalMode.value;
    const id = formModel.id;
    const payload = {
      title: formModel.title.trim(),
      content: formModel.content,
      status: formModel.status,
      category: formModel.category || category,
    };

    saving.value = true;
    try {
      if (mode === 'create') {
        await createAdminAnnouncement(payload);
        message.success('已创建');
      } else {
        await updateAdminAnnouncement(id, payload);
        message.success('已保存');
      }
      showModal.value = false;
      // 创建/编辑后重新读取真实数据
      await fetchAnnouncements();
    } catch (err) {
      // 失败保留表单输入
      message.error(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      saving.value = false;
    }
  };

  const handleDelete = async (row: AdminAnnouncementListVo) => {
    try {
      await deleteAdminAnnouncement(row.id);
      message.success('已删除');
      pagination.page = 1;
      await fetchAnnouncements();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const toggleStatus = async (row: AdminAnnouncementListVo) => {
    const nextStatus = row.status === 1 ? 0 : 1;
    try {
      await updateAdminAnnouncementStatus(row.id, nextStatus);
      message.success(nextStatus === 1 ? '已上线' : '已下线');
      await fetchAnnouncements();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '状态更新失败');
    }
  };

  void fetchAnnouncements();

  return {
    loading,
    saving,
    error,
    showModal,
    modalMode,
    announcements,
    pagination,
    searchForm,
    formModel,
    fetchAnnouncements,
    handleSearch,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
    openCreateModal,
    openEditModal,
    closeModal,
    handleModalShowChange,
    handleSubmit,
    handleDelete,
    toggleStatus,
  };
}
