import { ref, onMounted, onUnmounted } from 'vue';

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