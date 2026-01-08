<template>
  <div 
    class="contest-item" 
    :class="{ 'is-compact': compact }"
    :style="{ borderColor: statusStyle.borderColor }" 
    @click="$emit('click')"
  >
    
    <div class="header-section" :style="statusStyle.header">
      <div class="title-row">
        <div class="title-wrapper">
          <n-tag :bordered="false" size="small" :type="statusConfig.type" class="status-badge">
            {{ statusConfig.text }}
          </n-tag>
          <h3 class="title" :style="{ color: statusStyle.header.color }">
            <n-ellipsis :line-clamp="compact ? 1 : 2" :tooltip="false">
              {{ title }}
            </n-ellipsis>
          </h3>
        </div>
        
        <div v-if="!compact" class="time-display desktop-time" :style="{ color: statusStyle.header.color }">
          <n-icon :component="TimeIcon" />
          <span class="time-text">{{ timeText }}</span>
        </div>
      </div>

      <div v-if="compact" class="time-display mobile-time" :style="{ color: statusStyle.header.color }">
        <n-icon :component="TimeIcon" />
        <span class="time-text">{{ timeText }}</span>
      </div>
    </div>

    <div class="tags-section">
      <n-space :size="[6, 6]" :wrap="true">
        <n-tag 
          v-for="tag in tags" 
          :key="tag" 
          :bordered="false" 
          size="small" 
          round
          :style="getTagStyle(tag)"
        >
          {{ tag }}
        </n-tag>
      </n-space>
    </div>

    <div class="footer-section">
      <div class="source-info">
        <span class="label">来源：</span>
        <span class="source-text">
          <n-ellipsis style="max-width: 500px">{{ source }}</n-ellipsis>
        </span>
      </div>

      <div class="meta-actions">
        <div class="participant-info" :style="{ color: statusStyle.descColor }">
          <n-icon 
            :component="PeopleIcon"
            size="18"
          />
          <span>{{ participantCount }}</span>
        </div>

        <n-tooltip trigger="hover" v-if="showFollow">
          <template #trigger>
            <div class="star-btn" @click.stop="handleToggleFollow">
               <n-icon 
                 size="18" 
                 :component="isFollowed ? StarFilled : StarOutline" 
                 :color="isFollowed ? '#f0a020' : '#999'" 
               />
            </div>
          </template>
          {{ isFollowed ? '点击取消关注' : '关注后会邮件通知您' }}
        </n-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { 
  TimeOutline as TimeIcon, 
  PeopleOutline as PeopleIcon,
  StarOutline,
  Star as StarFilled
} from '@vicons/ionicons5';
import { useNotification } from 'naive-ui';
import { useContestStatusTime } from '@/composables/useContestTime';
import { stringToColor, stringToTextColor } from '@/utils/colorUtils';
import { useUserStore } from '@/stores/userStore';

const props = withDefaults(defineProps<{
  title: string;
  tags: string[];
  source: string;
  beginTime: string;
  endTime: string;
  participantCount: number;
  compact?: boolean; // 是否开启紧凑模式
  showFollow?: boolean; // 是否开启关注按钮
}>(), {
  compact: false,
  showFollow: true,
});

const emit = defineEmits(['click']);
const notification = useNotification();
const userStore = useUserStore();

const isFollowed = ref(false);

const handleToggleFollow = () => {
  if (!userStore.isEmailBound) {
    notification.error({
      content: '关注失败',
      meta: '您尚未绑定邮箱，无法接收比赛通知。请前往个人中心设置。',
      duration: 3000,
      keepAliveOnHover: true
    });
    return;
  }

  isFollowed.value = !isFollowed.value;

  if (isFollowed.value) {
    console.log('Event: Follow Contest Success');
    notification.success({
      content: '关注成功',
      meta: '比赛开始前将通过邮件通知您',
      duration: 2500
    });
  } else {
    console.log('Event: Unfollow Contest');
    notification.info({
      content: '已取消关注',
      duration: 2000
    });
  }
};

const { contestStatus, timeText } = useContestStatusTime(
  props.beginTime,
  props.endTime
);

const statusStyle = computed(() => {
  const configs = {
    0: { 
      header: { backgroundColor: '#f0f9f4', color: '#18a058' }, 
      descColor: '#999',
      borderColor: '#18a05880' 
    },
    1: { 
      header: { backgroundColor: '#fdf6ec', color: '#D5A000' }, 
      descColor: '#D5A000',
      borderColor: '#D5A00090'
    },
    2: { 
      header: { backgroundColor: '#fef0f0', color: '#f56c6c' }, 
      descColor: '#f56c6c',
      borderColor: '#f56c6c90'
    }
  };
  return configs[contestStatus.value];
});

const statusConfig = computed(() => {
  const map = {
    0: { text: '未开始', type: 'success' as const },
    1: { text: '进行中', type: 'warning' as const },
    2: { text: '已结束', type: 'error' as const }
  };
  return map[contestStatus.value];
});

const getTagStyle = (tag: string) => ({
  backgroundColor: stringToColor(tag),
  color: stringToTextColor(tag)
});
</script>

<style scoped lang="less">
.contest-item {
  background: #fff;
  border: 2px solid #efeff5;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  // Header 区域
  .header-section {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(0,0,0,0.03);

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .title-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;

      .status-badge { 
        flex-shrink: 0; 
        font-weight: bold; 
      }
      
      .title {
        margin: 0;
        font-size: 18px;
        font-weight: bold;
        line-height: 1.4;
      }
    }

    .time-display {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-family: 'Monaco', monospace;
      font-weight: 500;
      white-space: nowrap;
      
      &.desktop-time {
        margin-left: auto;
        flex-shrink: 0;
      }
      
      &.mobile-time {
        margin-top: 6px;
        font-size: 12px;
        opacity: 0.9;
      }
    }
  }

  // Tags 区域
  .tags-section {
    padding: 10px 16px 6px;
  }

  // Footer 区域
  .footer-section {
    padding: 6px 16px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .source-info {
      font-size: 13px;
      color: #888;
      display: flex;
      align-items: center;
      gap: 4px;
      
      .label { white-space: nowrap; }
      .source-text { 
        color: #2080f0; 
        font-weight: 500; 
      }
    }

    .meta-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .participant-info {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        white-space: nowrap;
      }
      
      .star-btn {
        display: flex;
        align-items: center;
        padding: 4px;
        border-radius: 50%;
        transition: background-color 0.2s;
        cursor: pointer;
        &:hover { background-color: rgba(0,0,0,0.05); }
      }
    }
  }
}

// 紧凑模式下的样式微调
.contest-item.is-compact {
  border-width: 1px;
  
  .header-section {
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    
    .title-row {
      width: 100%;
    }
    
    .title-wrapper {
      .title { font-size: 17px; }
    }
  }

  .tags-section {
    padding: 8px 12px 4px;
  }

  .footer-section {
    padding: 4px 12px 10px;
  }
}
</style>