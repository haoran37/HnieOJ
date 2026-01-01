<template>
  <div class="contest-item" @click="$emit('click')">
    <div class="header-row" :style="statusStyle.header">
      <n-ellipsis :line-clamp="1" class="contest-title">{{ title }}</n-ellipsis>
      <n-tag :type="tagType" size="small" :bordered="false">{{ tagName }}</n-tag>
    </div>

    <div class="body-row">
      <div class="info-left">
        <div class="info-line">
          <n-tag type="info" size="small" :bordered="false" class="label-tag">状态</n-tag>
          <span class="info-text" :style="{ color: statusStyle.descColor }">
            {{ statusInfo.desc }}
          </span>
        </div>
        <div class="info-line">
          <n-tag type="info" size="small" :bordered="false" class="label-tag">来源</n-tag>
          <span class="info-text source-link">{{ source }}</span>
        </div>
      </div>

      <div class="time-right">
        <div class="time-str">始：{{ formatTime(beginTime) }}</div>
        <div class="time-str">终：{{ formatTime(endTime) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useContestTimer, formatTime, formatDuration } from '@/composables/useContestTime';

interface StyleConfig {
  header: { backgroundColor: string; color: string; };
  descColor: string;
}

const props = defineProps<{
  title: string;
  tagName: string;
  tagType: 'success' | 'error' | 'warning' | 'info' | 'primary';
  source: string;
  beginTime: string;
  endTime: string;
}>();

const { now } = useContestTimer();

// 计算状态信息
const statusInfo = computed<{ type: 0 | 1 | 2; desc: string }>(() => {
  const start = new Date(props.beginTime).getTime();
  const end = new Date(props.endTime).getTime();
  const current = now.value.getTime();

  if (current < start) {
    return { type: 0, desc: `距开始 ${formatDuration(start - current)}` };
  } else if (current <= end) {
    return { type: 1, desc: `距结束 ${formatDuration(end - current)}` };
  } else {
    return { type: 2, desc: '已结束' };
  }
});

// 计算样式
const statusStyle = computed<StyleConfig>(() => {
  const configs: Record<0 | 1 | 2, StyleConfig> = {
    0: { header: { backgroundColor: '#f0f9f4', color: '#18a058' }, descColor: '#999' }, // 未开始
    1: { header: { backgroundColor: '#fdf6ec', color: '#D5A000' }, descColor: '#D5A000' }, // 进行中
    2: { header: { backgroundColor: '#fef0f0', color: '#f56c6c' }, descColor: '#f56c6c' }  // 已结束
  };
  return configs[statusInfo.value.type];
});

defineEmits(['click']);
</script>

<style scoped lang="less">
.contest-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background-color: #fff;
  transition: all 0.2s ease-in-out;

  &:hover {
    border-color: #007bff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .header-row {
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);

    .status-tag {
      margin-left: 10px;
      font-weight: bold;
    }
  }

  .body-row {
    padding: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .info-left {
      .info-line {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        &:last-child { margin-bottom: 0; }

        .label-tag {
          width: 44px;
          justify-content: center;
          margin-right: 12px;
          font-weight: bold;
        }
        .info-text {
          font-size: 14px;
          font-weight: 500;
        }
        .source-link {
          color: #007bff;
        }
      }
    }

    .time-right {
      text-align: right;
      .time-str {
        font-size: 13px;
        color: #888;
        line-height: 1.6;
      }
    }
  }
}

:deep(.contest-title) {
  font-size: 18px;
  font-weight: bold;
  flex: 1;
}
</style>