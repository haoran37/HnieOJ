import { ref, onMounted, onUnmounted } from 'vue';
import { getSystemTime } from '@/utils/api';
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
 * 比赛模式（独立大屏）：
 * 后端没有 /api/special/contest-mode 等独立开关/赛事信息接口，本页不得伪造赛事名称、
 * 倒计时或节点时延。仅展示真实的服务端时间，其余能力明确“暂未开放”。
 *
 * 时钟策略：按后端毫秒 epoch 校准本机偏移（offset = serverMs - localMs），本地每秒 tick
 * 刷新显示、每 60 秒重新同步一次；同步在途不叠请求；非法/失败响应保留上次有效校准，
 * 无有效校准时显示“--”；卸载清理两个 timer 且迟到响应不再写入。
 */
export function useContestMode() {
  const loading = ref(false);
  const available = false;
  const unavailableMessage = '比赛模式暂未开放';
  const systemTime = ref('--');

  // serverMs - localMs；null 表示尚无有效校准
  let offsetMs: number | null = null;
  let syncing = false;
  let disposed = false;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let syncTimer: ReturnType<typeof setInterval> | null = null;

  const renderSystemTime = () => {
    if (disposed) return;
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
    try {
      const time = await getSystemTime();
      if (disposed) return;
      const serverMs = isValidEpochMs(time?.unixTimestamp)
        ? time.unixTimestamp
        : parseServerTimeMs(time?.serverTime);
      if (serverMs !== null) offsetMs = serverMs - Date.now();
      renderSystemTime();
    } catch {
      // 网络暂时失败：保留已有校准，本地计时继续
      renderSystemTime();
    } finally {
      syncing = false;
    }
  };

  onMounted(() => {
    loading.value = true;
    void syncSystemTime().finally(() => {
      if (!disposed) loading.value = false;
    });
    // 每秒只做本地渲染；每 60 秒才向服务端校验一次时间
    tickTimer = setInterval(renderSystemTime, 1000);
    syncTimer = setInterval(() => {
      void syncSystemTime();
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
    available,
    unavailableMessage,
    systemTime,
  };
}
