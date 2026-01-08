import { ref, onMounted, onUnmounted, computed } from 'vue';

/**
 * 格式化日期显示 (年-月-日 时:分:秒)
 */
export const formatAllTime = () => {
  const date = new Date();
  if (isNaN(date.getTime())) return '无效时间';
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

/**
 * 格式化日期显示 (月-日 时:分)
 */
export const formatTime = (timeStr: string) => {
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return '无效时间';
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${M}-${D} ${h}:${m}`;
};

/**
 * 毫秒转倒计时格式 (HH:mm:ss)
 */
export const formatDuration = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * 比赛时间状态管理 Hook
 */
export function useContestTimer() {
  const now = ref(new Date());
  let timer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date();
    }, 1000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return {
    now
  };
}

/**
 * 比赛状态和时间逻辑
 */
export function useContestStatusTime(beginTime: string, endTime: string) {
  const { now } = useContestTimer();

  const startTimeMs = computed(() => new Date(beginTime).getTime());
  const endTimeMs = computed(() => new Date(endTime).getTime());

  const diffToStart = computed(() => startTimeMs.value - now.value.getTime());
  const diffToEnd = computed(() => endTimeMs.value - now.value.getTime());

  const contestStatus = computed(() => {
    if (diffToStart.value > 0) return 0; // 未开始
    if (diffToEnd.value > 0) return 1;   // 进行中
    return 2;                            // 已结束
  });

  const timeText = computed(() => {
    if (contestStatus.value === 2) return '已结束';
    if (contestStatus.value === 1) {
      return `距结束：${formatDuration(diffToEnd.value)}`;
    }

    if (diffToStart.value < 86400000) { // 开始时间在24h内
      return `距开始：${formatDuration(diffToStart.value)}`;
    } else {
      const date = new Date(beginTime);
      const M = date.getMonth() + 1;
      const D = date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `${M}月${D}日 ${h}:${m}`;
    }
  });

  return {
    contestStatus,
    timeText
  };
}