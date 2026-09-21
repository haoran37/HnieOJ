import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  deleteUserMessage,
  getUserMessages,
  getUserMessageUnreadCount,
  markAllUserMessagesRead,
  markUserMessageRead,
  type UserMessageVo,
} from '@/utils/api';

/**
 * 收件箱变更通知：本人消息读/删成功后派发，供同域侧栏/首页的未读入口
 * 主动刷新真实未读数（不引入全局状态框架）。
 */
export const USER_MESSAGES_CHANGED_EVENT = 'hnieoj:user-messages-changed';

const notifyMessagesChanged = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new Event(USER_MESSAGES_CHANGED_EVENT));
};

/** 订阅收件箱变更事件，返回取消订阅函数；非浏览器环境为空实现。 */
export function onUserMessagesChanged(handler: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  window.addEventListener(USER_MESSAGES_CHANGED_EVENT, handler);
  return () => window.removeEventListener(USER_MESSAGES_CHANGED_EVENT, handler);
}

export interface UseUserMessagesOptions {
  /** 返回 false 时禁止任何请求，用于确保不进入他人收件箱 */
  isActive?: () => boolean;
}

/**
 * 本人站内消息收件箱。
 *
 * - 数据一律来自 /api/user/messages 系列，uid 由服务端登录态决定，前端不传 ownerUid；
 * - 列表/未读数/单条已读/全部已读/删除使用独立状态，重复提交有 guard；
 * - 删除最后一页最后一条时回退页码；任何失败都不把未读数伪装成 0；
 * - isActive() 为 false（非本人页面）时任何方法都不发请求。
 */
export function useUserMessages(options: UseUserMessagesOptions = {}) {
  const message = useMessage();
  const active = () => options.isActive?.() ?? true;

  const loading = ref(false);
  const error = ref<string | null>(null);

  const messages = ref<UserMessageVo[]>([]);
  const totalCount = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(10);
  const unreadOnly = ref(false);

  // null 表示尚未成功读取（或读取失败），绝不当作 0
  const unreadCount = ref<number | null>(null);
  const unreadError = ref<string | null>(null);

  const markingId = ref<number | null>(null);
  const markingAll = ref(false);
  const deletingId = ref<number | null>(null);

  const detailMessage = ref<UserMessageVo | null>(null);
  const showDetail = ref(false);

  // generation：账号/路由切换时递增，作废所有在途读取与 mutation 的后续副作用
  let generation = 0;
  let listSeq = 0;
  let unreadSeq = 0;

  const fetchMessages = async () => {
    if (!active()) return;
    const gen = generation;
    const seq = ++listSeq;
    loading.value = true;
    error.value = null;
    try {
      const data = await getUserMessages(
        currentPage.value,
        pageSize.value,
        unreadOnly.value || undefined,
      );
      if (gen !== generation || seq !== listSeq) return;
      const list = data?.list ?? [];
      // 当前页被删空/越界时回退到上一页重读，不停留在空页
      if (list.length === 0 && currentPage.value > 1) {
        currentPage.value -= 1;
        void fetchMessages();
        return;
      }
      messages.value = list;
      totalCount.value = data?.total ?? 0;
    } catch (err) {
      if (gen !== generation || seq !== listSeq) return;
      messages.value = [];
      totalCount.value = 0;
      error.value = err instanceof Error ? err.message : '消息加载失败';
    } finally {
      if (gen === generation && seq === listSeq) loading.value = false;
    }
  };

  const fetchUnreadCount = async () => {
    if (!active()) return;
    const gen = generation;
    const seq = ++unreadSeq;
    try {
      const count = await getUserMessageUnreadCount();
      if (gen !== generation || seq !== unreadSeq) return;
      if (typeof count === 'number') {
        unreadCount.value = count;
        unreadError.value = null;
      } else {
        // 成功但响应不含数字：保留原值（从未成功过则仍为 null），绝不当 0，并记录异常
        unreadError.value = '未读数响应格式异常';
      }
    } catch (err) {
      if (gen !== generation || seq !== unreadSeq) return;
      // 保留上一次成功值；从未成功过则保持 null，不伪 0
      unreadError.value = err instanceof Error ? err.message : '未读数加载失败';
    }
  };

  const refresh = async () => {
    await Promise.all([fetchMessages(), fetchUnreadCount()]);
  };

  const setUnreadOnly = (value: boolean) => {
    if (unreadOnly.value === value) return;
    unreadOnly.value = value;
    currentPage.value = 1;
    void fetchMessages();
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
    void fetchMessages();
  };

  const handlePageSizeChange = (size: number) => {
    pageSize.value = size;
    currentPage.value = 1;
    void fetchMessages();
  };

  const handleSearch = () => {
    // 工具栏刷新：列表与未读数都必须重读，避免只刷新列表导致未读数过期
    currentPage.value = 1;
    void refresh();
  };

  const openDetail = (row: UserMessageVo) => {
    detailMessage.value = row;
    showDetail.value = true;
  };

  const closeDetail = () => {
    showDetail.value = false;
  };

  const handleDetailShowChange = (value: boolean) => {
    showDetail.value = value;
  };

  const markRead = async (row: UserMessageVo) => {
    if (!active()) return;
    if (markingId.value != null || markingAll.value) return;
    if (row.readAt) return;
    const gen = generation;
    markingId.value = row.id;
    try {
      await markUserMessageRead(row.id);
      if (gen !== generation || !active()) return;
      await refresh();
      if (gen !== generation || !active()) return;
      notifyMessagesChanged();
    } catch (err) {
      if (gen !== generation || !active()) return;
      message.error(err instanceof Error ? err.message : '标记已读失败，请重试');
    } finally {
      if (gen === generation) markingId.value = null;
    }
  };

  const markAllRead = async () => {
    if (!active()) return;
    if (markingAll.value || markingId.value != null) return;
    const gen = generation;
    markingAll.value = true;
    try {
      await markAllUserMessagesRead();
      if (gen !== generation || !active()) return;
      message.success('已全部标记为已读');
      await refresh();
      if (gen !== generation || !active()) return;
      notifyMessagesChanged();
    } catch (err) {
      if (gen !== generation || !active()) return;
      message.error(err instanceof Error ? err.message : '全部已读失败，请重试');
    } finally {
      if (gen === generation) markingAll.value = false;
    }
  };

  const remove = async (row: UserMessageVo) => {
    if (!active()) return;
    if (deletingId.value != null) return;
    const gen = generation;
    deletingId.value = row.id;
    try {
      await deleteUserMessage(row.id);
      if (gen !== generation || !active()) return;
      message.success('已删除');
      // 删除当前页最后一条时回退页码
      if (messages.value.length === 1 && currentPage.value > 1) {
        currentPage.value -= 1;
      }
      await refresh();
      if (gen !== generation || !active()) return;
      notifyMessagesChanged();
    } catch (err) {
      if (gen !== generation || !active()) return;
      message.error(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      if (gen === generation) deletingId.value = null;
    }
  };

  // 切换他人 route / 账号：作废在途列表/未读数/操作，并清空详情、计数、错误与页码
  const reset = () => {
    ++generation;
    ++listSeq;
    ++unreadSeq;
    loading.value = false;
    error.value = null;
    messages.value = [];
    totalCount.value = 0;
    currentPage.value = 1;
    unreadOnly.value = false;
    unreadCount.value = null;
    unreadError.value = null;
    markingId.value = null;
    markingAll.value = false;
    deletingId.value = null;
    detailMessage.value = null;
    showDetail.value = false;
  };

  return {
    loading,
    error,
    messages,
    totalCount,
    currentPage,
    pageSize,
    unreadOnly,
    unreadCount,
    unreadError,
    markingId,
    markingAll,
    deletingId,
    detailMessage,
    showDetail,
    fetchMessages,
    fetchUnreadCount,
    refresh,
    setUnreadOnly,
    handlePageChange,
    handlePageSizeChange,
    handleSearch,
    openDetail,
    closeDetail,
    handleDetailShowChange,
    markRead,
    markAllRead,
    remove,
    reset,
  };
}
