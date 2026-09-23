import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getSystemTime, getFeaturedContest, type FeaturedContestVo } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

/**
 * 系统时间格式化：统一使用本地时区，避免 UTC 日期与本地时间混用导致跨零点日期错误。
 * 后端 unixTimestamp 为毫秒 epoch，原样传入 Date，不做单位换算。
 */
export function formatSystemTime(timestampMs: number | null | undefined): string | null {
  if (timestampMs === null || timestampMs === undefined) return null;
  return formatFullTime(new Date(timestampMs));
}

/** 毫秒 epoch 合法性：0（1970-01-01）与负值都是合法时间戳；null/NaN/Infinity 非法 */
function isValidEpochMs(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** serverTime 字符串回退：只接受能解析出有限毫秒时间戳的非空字符串，绝不把 null 当成 0 */
function parseServerTimeMs(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 比赛模式（独立大屏）：展示公开进行中或最近即将开始的比赛。
 *
 * 时钟策略：按后端毫秒 epoch 校准本机偏移（offset = serverMs - localMs），本地每秒 tick
 * 刷新显示、每 60 秒重新同步一次；同步在途不叠请求；非法/失败响应保留上次有效校准，
 * 无有效校准时显示“--”；卸载清理两个 timer 且迟到响应不再写入。
 */
export function useContestMode() {
  const loading = ref(false);
  const systemTime = ref('--');
  const featured = ref<FeaturedContestVo | null>(null);
  const featuredError = ref(false);
  const online = ref(false);
  const latencyMs = ref<number | null>(null);
  const currentMs = ref(Date.now());
  const countdown = computed(() => {
    if (!featured.value) return '--:--:--';
    const target = Date.parse(featured.value.status === 'running' ? featured.value.endTime : featured.value.startTime);
    const seconds = Math.max(0, Math.ceil((target - currentMs.value) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  });

  // serverMs - localMs；null 表示尚无有效校准
  let offsetMs: number | null = null;
  let syncing = false;
  let disposed = false;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let syncTimer: ReturnType<typeof setInterval> | null = null;

  const renderSystemTime = () => {
    if (disposed) return;
    currentMs.value = Date.now() + (offsetMs ?? 0);
    if (offsetMs === null) {
      systemTime.value = '--';
      return;
    }
    systemTime.value = formatSystemTime(Date.now() + offsetMs) ?? '--';
  };

  // 同步只负责校准偏移；非法响应不得覆盖上次有效校准，也不得把 null/NaN 当作 epoch 0
  const syncSystemTime = async () => {
    if (disposed || syncing) return;
    syncing = true;
    const started = performance.now();
    try {
      const time = await getSystemTime();
      if (disposed) return;
      const serverMs = isValidEpochMs(time?.unixTimestamp)
        ? time.unixTimestamp
        : parseServerTimeMs(time?.serverTime);
      if (serverMs !== null) offsetMs = serverMs - Date.now();
      online.value = serverMs !== null;
      latencyMs.value = Math.round(performance.now() - started);
      renderSystemTime();
    } catch {
      online.value = false;
      latencyMs.value = null;
      // 网络暂时失败：保留已有校准，本地计时继续
      renderSystemTime();
    } finally {
      syncing = false;
    }
  };

  const syncFeatured = async () => {
    try {
      const value = await getFeaturedContest();
      if (!disposed) { featured.value = value; featuredError.value = false; }
    } catch {
      if (!disposed) featuredError.value = true;
    }
  };

  onMounted(() => {
    loading.value = true;
    void Promise.all([syncSystemTime(), syncFeatured()]).finally(() => {
      if (!disposed) loading.value = false;
    });
    // 每秒只做本地渲染；每 60 秒才向服务端校验一次时间
    tickTimer = setInterval(renderSystemTime, 1000);
    syncTimer = setInterval(() => {
      void syncSystemTime();
      void syncFeatured();
    }, 60_000);
  });

  onUnmounted(() => {
    disposed = true;
    if (tickTimer !== null) clearInterval(tickTimer);
    if (syncTimer !== null) clearInterval(syncTimer);
    tickTimer = null;
    syncTimer = null;
  });

  return {
    loading,
    featured,
    featuredError,
    online,
    latencyMs,
    countdown,
    systemTime,
  };
}
