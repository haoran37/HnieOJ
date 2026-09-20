<template>
  <div class="user-list-page message-page">
    <template v-if="!isSelf">
      <n-result
        status="warning"
        title="无法查看他人消息"
        description="站内消息仅本人可见；请前往本人的消息页查看。"
      >
        <template v-if="ownUid" #footer>
          <n-button type="primary" @click="goOwnMessages">查看我的消息</n-button>
        </template>
      </n-result>
    </template>

    <template v-else>
      <n-card :bordered="false">
        <div class="toolbar">
          <n-space align="center">
            <n-radio-group
              :value="unreadOnly"
              size="small"
              @update:value="(value: boolean) => setUnreadOnly(value)"
            >
              <n-radio-button :value="false">全部</n-radio-button>
              <n-radio-button :value="true">未读</n-radio-button>
            </n-radio-group>
            <n-tag v-if="unreadCount !== null" type="error" size="small" :bordered="false">
              未读 {{ unreadCount }}
            </n-tag>
            <n-tag v-else-if="unreadError" type="warning" size="small" :bordered="false">
              未读数加载失败
            </n-tag>
          </n-space>
          <n-space>
            <n-button size="small" @click="handleSearch">刷新</n-button>
            <n-button
              size="small"
              type="primary"
              secondary
              :loading="markingAll"
              :disabled="markingAll || !unreadCount"
              @click="markAllRead"
            >
              全部已读
            </n-button>
          </n-space>
        </div>

        <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
          {{ error }}
          <template #action>
            <n-button size="small" @click="refresh">重试</n-button>
          </template>
        </n-alert>

        <n-data-table
          remote
          :columns="columns"
          :data="messages"
          :loading="loading"
          :row-key="(row: UserMessageVo) => row.id"
          :pagination="false"
          :row-props="rowProps"
        />

        <n-empty
          v-if="!loading && !error && messages.length === 0"
          description="暂无消息"
          style="padding: 40px 0"
        />

        <div class="pagination-wrapper">
          <n-pagination
            :page="currentPage"
            :page-size="pageSize"
            :item-count="totalCount"
            show-size-picker
            :page-sizes="[10, 20, 50]"
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>
      </n-card>

      <n-modal
        :show="showDetail"
        preset="card"
        title="消息详情"
        :style="{ width: 'auto', minWidth: '520px', maxWidth: '90vw' }"
        @update:show="handleDetailShowChange"
      >
        <template v-if="detailMessage">
          <h3 class="detail-title">{{ detailMessage.title }}</h3>
          <div class="detail-meta">
            发送时间：{{ formatFullTime(detailMessage.createdAt) }}
            <span v-if="detailMessage.readAt"> · 已读：{{ formatFullTime(detailMessage.readAt) }}</span>
            <span v-else> · 未读</span>
          </div>
          <pre class="detail-content">{{ detailMessage.content }}</pre>
        </template>
      </n-modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NSpace, NTag, useDialog, type DataTableColumns } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { useUserMessages } from '@/composables/oj/useUserMessages';
import { useUserStore } from '@/stores/userStore';
import type { UserMessageVo } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const userStore = useUserStore();

const ownUid = computed(() => userStore.userInfo?.id || '');
const isSelf = computed(
  () => !!ownUid.value && String(route.params.uid) === String(ownUid.value),
);

const {
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
  refresh,
  setUnreadOnly,
  handlePageChange,
  handlePageSizeChange,
  handleSearch,
  openDetail,
  handleDetailShowChange,
  markRead,
  markAllRead,
  remove,
  reset,
} = useUserMessages({ isActive: () => isSelf.value });

const goOwnMessages = () => {
  if (!ownUid.value) return;
  void router.push({ name: 'UserMessage', params: { uid: ownUid.value } });
};

const confirmRemove = (row: UserMessageVo) => {
  dialog.warning({
    title: '删除消息',
    content: '删除后将从本人收件箱移除，确认删除？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => remove(row),
  });
};

const rowProps = (row: UserMessageVo) => ({
  style: 'cursor: pointer;',
  onClick: () => openDetail(row),
});

const columns: DataTableColumns<UserMessageVo> = [
  {
    title: '',
    key: 'status',
    width: 70,
    render: (row) =>
      row.readAt
        ? h(NTag, { size: 'small', bordered: false }, () => '已读')
        : h(NTag, { size: 'small', type: 'error', bordered: false }, () => '未读'),
  },
  { title: '标题', key: 'title', minWidth: 180, className: 'cell-wrap' },
  { title: '正文', key: 'content', minWidth: 220, className: 'cell-wrap' },
  {
    title: '时间',
    key: 'createdAt',
    width: 170,
    render: (row) => formatFullTime(row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h(NSpace, { size: 4 }, {
        default: () => [
          h(
            NButton,
            {
              size: 'tiny',
              secondary: true,
              disabled: !!row.readAt || markingId.value === row.id,
              onClick: (e: MouseEvent) => {
                e.stopPropagation();
                void markRead(row);
              },
            },
            { default: () => '标记已读' },
          ),
          h(
            NButton,
            {
              size: 'tiny',
              type: 'error',
              secondary: true,
              disabled: deletingId.value === row.id,
              onClick: (e: MouseEvent) => {
                e.stopPropagation();
                confirmRemove(row);
              },
            },
            { default: () => '删除' },
          ),
        ],
      }),
  },
];

const reload = () => {
  if (!isSelf.value) return;
  void refresh();
};

watch(
  () => [route.params.uid, ownUid.value] as const,
  () => {
    // 切页/切账号立即重置：作废在途列表/未读/mutation，避免把上一个用户的消息显示成当前用户消息
    reset();
    if (isSelf.value) {
      void refresh();
    }
  },
  { flush: 'sync' },
);

onMounted(reload);
onBeforeUnmount(() => reset());
</script>

<style scoped lang="less">
.message-page {
  :deep(.n-card) {
    width: 100%;
  }
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
:deep(.cell-wrap) {
  white-space: normal;
  word-break: break-word;
}
.detail-title {
  margin: 0 0 8px;
  word-break: break-word;
}
.detail-meta {
  color: #888;
  font-size: 13px;
  margin-bottom: 12px;
}
.detail-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  margin: 0;
}
</style>
