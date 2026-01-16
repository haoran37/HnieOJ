import { ref, onMounted, onUnmounted, computed, unref, type Ref } from 'vue';

/**
 * 获取当前时间的格式化字符串 (年-月-日 时:分:秒)
 * @deprecated 建议使用 formatFullTime(new Date()) 代替
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
export const formatTime = (timeStr: string | number | Date) => {
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return '无效时间';
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${M}-${D} ${h}:${m}`;
};

/**
 * 格式化完整日期 (YYYY/MM/DD HH:mm:ss)
 */
export const formatFullTime = (time: string | number | Date | null | undefined) => {
  if (!time) return '-';
  const date = new Date(time);
  if (isNaN(date.getTime())) return '-';
  
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  
  return `${Y}/${M}/${D} ${h}:${m}:${s}`;
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
 * 通用计时器
 */
export function useTimer() {
  const now = ref(new Date());
  let timer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    now.value = new Date();
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
 * 通用状态时间逻辑 (未开始/进行中/已结束)
 */
type MaybeRefOrGetter<T> = Ref<T> | (() => T) | T;

export function useStatusTime(
  beginTimeSource: MaybeRefOrGetter<string>, 
  endTimeSource: MaybeRefOrGetter<string>
) {
  const { now } = useTimer();

  const resolve = (val: MaybeRefOrGetter<string>) => {
    return typeof val === 'function' ? val() : unref(val);
  };

  const startTimeMs = computed(() => new Date(resolve(beginTimeSource)).getTime());
  const endTimeMs = computed(() => new Date(resolve(endTimeSource)).getTime());

  const diffToStart = computed(() => startTimeMs.value - now.value.getTime());
  const diffToEnd = computed(() => endTimeMs.value - now.value.getTime());

  const contestStatus = computed(() => {
    if (isNaN(startTimeMs.value)) return 0; // 时间无效或为空，视作未开始
    if (diffToStart.value > 0) return 0;    // 未开始
    if (diffToEnd.value > 0) return 1;      // 进行中
    return 2;                               // 已结束
  });

  const timeText = computed(() => {
    if (contestStatus.value === 2) return '已结束';
    if (contestStatus.value === 1) {
      return `距结束：${formatDuration(diffToEnd.value)}`;
    }
    if (diffToStart.value < 86400000) { // 24小时内显示倒计时
      return `距开始：${formatDuration(diffToStart.value)}`;
    } else {
      const date = new Date(resolve(beginTimeSource));
      const M = date.getMonth() + 1;
      const D = date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `${M}月${D}日 ${h}:${m}`;
    }
  });

  return { contestStatus, timeText, now };
}