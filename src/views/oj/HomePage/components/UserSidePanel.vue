<template>
  <BoardCard title="用户">
    <template #icon>
      <n-icon size="20"><UserIcon /></n-icon>
    </template>

    <div class="user-panel-content">
      <div class="left-info">
        <div class="stat-line">
          <n-icon size="26" class="stat-icon blue-icon"><BarChartIcon /></n-icon>
          <span class="stat-label">评分:</span>
          <span class="stat-value">{{ rating === null ? '—' : rating }}</span>
        </div>
        <div class="stat-line">
          <n-icon size="26" class="stat-icon red-icon"><RibbonIcon /></n-icon>
          <span class="stat-label">贡献:</span>
          <span class="stat-value">{{ contribution === null ? '—' : contribution }}</span>
        </div>

        <ul class="nav-list">
          <li v-for="item in menuItems" :key="item.key">
            <span class="dot">•</span>
            <n-button 
              text 
              type="primary" 
              class="nav-link" 
              @click="handleMenuClick(item.key)"
            >
              {{ item.label }}
              <span
                v-if="item.key === 'messages' && unreadCount"
                class="unread-badge"
              >{{ unreadCount }}</span>
            </n-button>
          </li>
        </ul>
      </div>

      <div class="right-avatar">
        <n-avatar
          :size="140"
          :style="{
            backgroundColor: '#2080f0',
            fontSize: '48px',
          }"
          :src="userStore.userInfo?.avatar || undefined"
         />
        <div class="display-username">{{ userStore.userInfo?.username || '未登录' }}</div>
      </div>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { 
  PersonOutline as UserIcon,
  BarChartOutline as BarChartIcon,
  RibbonOutline as RibbonIcon
} from '@vicons/ionicons5';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BoardCard from '@/components/BoardCard.vue';
import { useUserStore } from '@/stores/userStore';
import { getUserMessageUnreadCount, getContestRating, getUserContribution } from '@/utils/api';
import { onUserMessagesChanged } from '@/composables/oj/useUserMessages';

const userStore = useUserStore();

// 真实未读数：读取失败保持 null，不伪装成 0
const unreadCount = ref<number | null>(null);
const rating = ref<number | null>(null);
const contribution = ref<number | null>(null);
let scoreSeq = 0;
watch(() => userStore.userInfo?.id, async uid => {
  const current = ++scoreSeq;
  rating.value = null;
  contribution.value = null;
  if (!uid) return;
  const [ratingResult, contributionResult] = await Promise.allSettled([
    getContestRating(uid), getUserContribution(uid),
  ]);
  if (current !== scoreSeq) return;
  rating.value = ratingResult.status === 'fulfilled' ? (ratingResult.value?.rating ?? null) : null;
  contribution.value = contributionResult.status === 'fulfilled' ? (contributionResult.value?.contribution ?? null) : null;
}, { immediate: true });

// 请求序号：账号切换后作废旧未读数响应，避免串号
let unreadSeq = 0;
const loadUnread = async () => {
  const seq = ++unreadSeq;
  if (!userStore.userInfo?.id) {
    unreadCount.value = null;
    return;
  }
  try {
    const count = await getUserMessageUnreadCount();
    if (seq !== unreadSeq || !userStore.userInfo?.id) return;
    unreadCount.value = typeof count === 'number' ? count : null;
  } catch {
    if (seq !== unreadSeq) return;
    unreadCount.value = null;
  }
};

// 收件箱读/删成功后主动刷新真实未读数（同域事件，不引入全局状态框架）
const offMessagesChanged = onUserMessagesChanged(() => {
  void loadUnread();
});
onBeforeUnmount(() => {
  ++unreadSeq;
  ++scoreSeq;
  offMessagesChanged();
});
onMounted(loadUnread);

// 菜单配置
const menuItems = [
  { label: '设置', key: 'settings' },
  { label: '团队', key: 'teams' },
  { label: '已提交', key: 'submissions' },
  { label: '收藏', key: 'favorites' },
  { label: '消息', key: 'messages' },
  { label: '比赛', key: 'contests' },
];

const emit = defineEmits(['menu-click']);

const handleMenuClick = (key: string) => {
  emit('menu-click', key);
};
</script>

<style scoped lang="less">
.user-panel-content {
  display: flex;
  justify-content: space-between;
  padding: 10px 5px;

  .left-info {
    flex: 1;

    .stat-line {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 16px;
      color: #333;

      .stat-icon {
        margin-right: 8px;
        color: #333;
        &.red-icon { color: #d03050; }
        &.blue-icon { color: #070096; }
      }
      .stat-label { font-weight: bold; font-size: 17px; }
      .stat-value { font-weight: bold; font-size: 17px;}
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 15px 0 0 5px;

      li {
        display: flex;
        align-items: center;
        margin-bottom: 4px;

        .dot {
          margin-right: 8px;
          color: #333;
          font-weight: bold;
        }

        .nav-link {
          font-size: 15px;
          font-weight: 500;
          font-weight: bold;
          color: #2080f0;

          .unread-badge {
            display: inline-block;
            margin-left: 4px;
            padding: 0 6px;
            border-radius: 8px;
            background: #d03050;
            color: #fff;
            font-size: 12px;
            line-height: 16px;
          }
        }
      }
    }
  }

  .right-avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-left: 15px;

    .display-username {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
  }
}
</style>
