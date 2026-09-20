import { reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  createAdminTag,
  deleteAdminTag,
  getTags,
  updateAdminTag,
  type TagVo,
} from '@/utils/api';

export const TAG_NAME_MAX = 50;
export const TAG_COLOR_MAX = 20;
export const TAG_CATEGORY_MAX = 50;

export interface TagForm {
  id: number;
  name: string;
  color: string;
  category: string;
}

/**
 * 标签全局管理：对后端真实标签目录做 CRUD。
 *
 * - 列表来自 GET /api/tags（API 无分页，本地分页且 itemCount 为真实条数，不伪造 total）；
 * - 创建/编辑 POST/PUT /api/admin/tags，删除 DELETE /api/admin/tags/{id}；
 * - 名称必填且 trim 后 ≤50，color ≤20，category ≤50；编辑允许清空可选值；
 * - 删除被题目引用的标签由后端返回“仍被引用”业务错误，原样提示，不伪造成功。
 */
export function useTagManage() {
  const message = useMessage();

  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const tags = ref<TagVo[]>([]);

  const showModal = ref(false);
  const modalMode = ref<'create' | 'edit'>('create');

  const formModel = reactive<TagForm>({ id: 0, name: '', color: '', category: '' });

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
  });

  // API 无分页：本地分页，itemCount 始终为真实目录条数
  let fetchSeq = 0;

  const fetchTags = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    error.value = null;
    try {
      const list = await getTags();
      if (seq !== fetchSeq) return;
      tags.value = list ?? [];
      pagination.itemCount = tags.value.length;
      const maxPage = Math.max(1, Math.ceil(tags.value.length / pagination.pageSize));
      if (pagination.page > maxPage) pagination.page = maxPage;
    } catch (err) {
      if (seq !== fetchSeq) return;
      // 加载失败不得当成空目录：清空列表并保留错误，页面据此展示重试
      tags.value = [];
      pagination.itemCount = 0;
      error.value = err instanceof Error ? err.message : '标签目录加载失败';
    } finally {
      if (seq === fetchSeq) loading.value = false;
    }
  };

  const resetForm = () => {
    formModel.id = 0;
    formModel.name = '';
    formModel.color = '';
    formModel.category = '';
  };

  const openCreateModal = () => {
    // 保存进行中禁止切换到新建，避免在途请求结果写入新表单
    if (saving.value) return;
    modalMode.value = 'create';
    resetForm();
    showModal.value = true;
  };

  const openEditModal = (row: TagVo) => {
    if (saving.value) return;
    modalMode.value = 'edit';
    formModel.id = row.id;
    formModel.name = row.name ?? '';
    formModel.color = row.color ?? '';
    formModel.category = row.category ?? '';
    showModal.value = true;
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

    const name = formModel.name.trim();
    const color = formModel.color.trim();
    const category = formModel.category.trim();

    if (!name) {
      message.warning('请输入标签名称');
      return;
    }
    if (name.length > TAG_NAME_MAX) {
      message.warning(`标签名称不能超过 ${TAG_NAME_MAX} 个字符`);
      return;
    }
    if (color.length > TAG_COLOR_MAX) {
      message.warning(`颜色值不能超过 ${TAG_COLOR_MAX} 个字符`);
      return;
    }
    if (category.length > TAG_CATEGORY_MAX) {
      message.warning(`分类不能超过 ${TAG_CATEGORY_MAX} 个字符`);
      return;
    }

    // 保存期间捕获模式与 id，避免切换记录后把结果写到别的标签上
    const mode = modalMode.value;
    const id = formModel.id;
    const payload = { name, color, category };

    saving.value = true;
    try {
      if (mode === 'create') {
        await createAdminTag(payload);
        message.success('标签已创建');
      } else {
        await updateAdminTag(id, payload);
        message.success('标签已保存');
      }
      showModal.value = false;
      await fetchTags();
    } catch (err) {
      // 失败保留表单，由用户修正后重试
      message.error(err instanceof Error ? err.message : '保存标签失败');
    } finally {
      saving.value = false;
    }
  };

  const handleDelete = async (row: TagVo) => {
    try {
      await deleteAdminTag(row.id);
      message.success('标签已删除');
      await fetchTags();
    } catch (err) {
      // 后端“仍被题目引用”等业务错误原样展示，不伪造删除成功
      message.error(err instanceof Error ? err.message : '删除标签失败');
    }
  };

  const handlePageChange = (page: number) => {
    pagination.page = page;
  };

  const handlePageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
  };

  return {
    loading,
    saving,
    error,
    tags,
    showModal,
    modalMode,
    formModel,
    pagination,
    fetchTags,
    openCreateModal,
    openEditModal,
    closeModal,
    handleModalShowChange,
    handleSubmit,
    handleDelete,
    handlePageChange,
    handlePageSizeChange,
  };
}
