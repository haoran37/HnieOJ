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

/**
 * 比赛模式（独立大屏）：
 * 后端没有 /api/special/contest-mode 等独立开关/赛事信息接口，本页不得伪造赛事名称、
 * 倒计时或节点时延。仅展示真实的服务端时间，其余能力明确“暂未开放”。
 */
export function useContestMode() {
  const loading = ref(false);
  const available = false;
  const unavailableMessage = '比赛模式暂未开放';
  const systemTime = ref('--');

  let timerInterval: number | null = null;

  const updateSystemTime = async () => {
    try {
      const time = await getSystemTime();
      if (time?.unixTimestamp) {
        systemTime.value = formatSystemTime(time.unixTimestamp) ?? '--';
        return;
      }
      systemTime.value = time?.serverTime ?? '--';
    } catch {
      systemTime.value = '--';
    }
  };

  onMounted(() => {
    loading.value = true;
    void updateSystemTime().finally(() => {
      loading.value = false;
    });
    timerInterval = setInterval(updateSystemTime, 1000) as unknown as number;
  });

  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  return {
    loading,
    available,
    unavailableMessage,
    systemTime,
  };
}
