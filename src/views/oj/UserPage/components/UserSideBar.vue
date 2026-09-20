<template>
  <div class="user-sidebar">
    <n-card :bordered="false" size="small" class="side-card profile-card">
      <n-spin :show="loading">
        <n-alert v-if="error" type="error" :bordered="false" size="small" style="margin-bottom: 8px">
          {{ error }}
        </n-alert>

        <div class="profile-header">
          <n-avatar round :size="80" :src="profile?.avatar || undefined" class="avatar" />
          <div class="names">
            <div class="username">{{ profile?.username || '未知用户' }}</div>
            <n-tag v-if="roleText" :type="roleType" size="small" :bordered="false" round>
              {{ roleText }}
            </n-tag>
          </div>
        </div>

        <n-divider style="margin: 12px 0" />

        <div class="info-list">
          <div class="info-item">
            <span class="label">姓名</span>
            <span class="value">{{ profile?.realname || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="label">学号</span>
            <span class="value">{{ profile?.uid || route.params.uid }}</span>
          </div>
          <div class="info-item">
            <span class="label">学院</span>
            <span class="value">{{ profile?.college || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="label">年级</span>
            <span class="value">{{ profile?.grade || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="label">班级</span>
            <span class="value">{{ profile?.majorClass || '未填写' }}</span>
          </div>
        </div>
      </n-spin>
    </n-card>

    <n-card title="个人成就" :bordered="false" size="small" class="side-card">
      <n-spin :show="loading">
        <n-data-table
          v-if="achievements.length > 0"
          :columns="achievementColumns"
          :data="achievements"
          :bordered="false"
          size="small"
          :pagination="false"
          class="mini-table"
        />
        <n-empty v-else description="暂无成就记录" size="small" />
      </n-spin>
    </n-card>

    <n-card
      v-if="isSelf"
      title="消息"
      :bordered="false"
      size="small"
      class="side-card"
    >
      <div class="message-entry">
        <span v-if="unreadCount !== null" class="unread-text">
          {{ unreadCount > 0 ? `未读消息 ${unreadCount} 条` : '暂无未读消息' }}
        </span>
        <span v-else class="unread-failed">未读数加载失败</span>
        <n-button text type="primary" @click="goMessages">查看消息</n-button>
      </div>
    </n-card>

    <n-card title="提交统计" :bordered="false" size="small" class="side-card">
      <n-empty description="提交统计暂未开放：后端暂无用户历史统计接口" size="small" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getUserAchievements, getUserDetail, getUserMessageUnreadCount, type UserDetailVo, type UserAchievementVo } from '@/utils/api';
import { onUserMessagesChanged } from '@/composables/oj/useUserMessages';
import { formatFullTime } from '@/composables/useTime';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const error = ref<string | null>(null);
const profile = ref<UserDetailVo | null>(null);
const achievements = ref<UserAchievementVo[]>([]);

// 消息入口仅本人可见；未读数读取失败不伪 0
const unreadCount = ref<number | null>(null);
const ownUid = computed(() => userStore.userInfo?.id || '');
const isSelf = computed(
  () => !!ownUid.value && String(route.params.uid) === String(ownUid.value),
);

// 请求序号：路由/账号切换后作废旧未读数响应，避免把上一个用户的计数显示给当前用户
let unreadSeq = 0;
const loadUnread = async () => {
  const seq = ++unreadSeq;
  if (!isSelf.value) {
    unreadCount.value = null;
    return;
  }
  try {
    const count = await getUserMessageUnreadCount();
    if (seq !== unreadSeq || !isSelf.value) return;
    unreadCount.value = typeof count === 'number' ? count : null;
  } catch {
    if (seq !== unreadSeq) return;
    unreadCount.value = null;
  }
};

const goMessages = () => {
  if (!ownUid.value) return;
  void router.push({ name: 'UserMessage', params: { uid: ownUid.value } });
};

// 收件箱读/删成功后主动刷新真实未读数（同域事件，不引入全局状态框架）
const offMessagesChanged = onUserMessagesChanged(() => {
  void loadUnread();
});
onBeforeUnmount(() => {
  ++unreadSeq;
  offMessagesChanged();
});

let seq = 0;
const load = async (uid: string) => {
  if (!uid) return;
  const current = ++seq;
  loading.value = true;
  error.value = null;
  try {
    const [detail, achievementPage] = await Promise.all([
      getUserDetail(uid),
      getUserAchievements(uid, 1, 20),
    ]);
    if (current !== seq) return;
    profile.value = detail;
    achievements.value = achievementPage?.list ?? [];
  } catch (err) {
    if (current !== seq) return;
    profile.value = null;
    achievements.value = [];
    error.value = err instanceof Error ? err.message : '用户信息加载失败';
  } finally {
    if (current === seq) loading.value = false;
  }
};

const roleText = computed(() => {
  const roles = profile.value?.roles ?? [];
  if (roles.length === 0) return '';
  return (roles[roles.length - 1] ?? '').toUpperCase();
});

const roleType = computed<'error' | 'info' | 'warning' | 'success'>(() => {
  const role = roleText.value;
  if (role === 'ADMIN' || role === 'ROOT') return 'error';
  if (role === 'TEACHER') return 'info';
  if (role === 'TA') return 'warning';
  return 'success';
});

const achievementColumns = [
  {
    title: '时间',
    key: 'achieveTime',
    width: 110,
    render: (row: UserAchievementVo) => formatFullTime(row.achieveTime),
  },
  { title: '内容', key: 'title' },
];

watch(
  () => [route.params.uid, ownUid.value] as const,
  () => {
    void loadUnread();
    const uid = String(route.params.uid ?? '');
    if (uid) void load(uid);
  },
  { immediate: true },
);
</script>

<style scoped lang="less">
.user-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;

  .names {
    margin-top: 10px;
    text-align: center;
    .username { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 4px; }
  }
}

.info-list {
  .info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    .label { color: #888; }
    .value { color: #333; font-weight: 500; }
  }
}

:deep(.mini-table .n-data-table-thead) {
  display: none;
}
:deep(.mini-table .n-data-table-td) {
  padding: 6px 8px;
  font-size: 12px;
  border-bottom: 1px solid #f9f9f9;
}

.message-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  .unread-text { color: #333; font-weight: 500; }
  .unread-failed { color: #d03050; }
}
</style>
