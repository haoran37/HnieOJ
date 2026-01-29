import { ref, onMounted, onUnmounted } from 'vue';

export interface ContestModeInfo {
  title: string;
  subtitle: string;
  startTime: string; // ISO String
  serverNode: string;
  latency: string;
}

export function useContestMode() {
  const contestInfo = ref<ContestModeInfo>({
    title: 'Loading...',
    subtitle: '',
    startTime: new Date().toISOString(),
    serverNode: 'Unknown',
    latency: '--'
  });
  
  const loading = ref(false);
  const timeRemaining = ref({
    hours: '00',
    minutes: '00',
    seconds: '00'
  });
  const systemTime = ref('');
  
  let timerInterval: number | null = null;
  let timeInterval: number | null = null;

  // Mock API Call
  const fetchContestInfo = async () => {
    loading.value = true;
    console.log('GET /api/special/contest-mode'); // Placeholder for RESTful API call
    
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Mock Response
        const targetDate = new Date();
        targetDate.setHours(targetDate.getHours() + 24); // 24 hours from now
        
        contestInfo.value = {
          title: '湖南工程学院程序设计大赛',
          subtitle: 'Hunan Institute of Engineering 2022-2023 Programming Contest',
          startTime: targetDate.toISOString(),
          serverNode: 'CN_HN_04',
          latency: '24ms'
        };
        loading.value = false;
        resolve();
      }, 500);
    });
  };

  const updateCountdown = () => {
    const now = new Date();
    const target = new Date(contestInfo.value.startTime);
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      timeRemaining.value = { hours: '00', minutes: '00', seconds: '00' };
      return;
    }

    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (num: number) => num.toString().padStart(2, '0');
    
    timeRemaining.value = {
      hours: pad(h),
      minutes: pad(m),
      seconds: pad(s)
    };
  };

  const updateSystemTime = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    systemTime.value = `${dateStr} ${timeStr}`;
  };

  onMounted(async () => {
    await fetchContestInfo();
    updateCountdown();
    updateSystemTime();
    
    timerInterval = setInterval(updateCountdown, 1000) as unknown as number;
    timeInterval = setInterval(updateSystemTime, 1000) as unknown as number;
  });

  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
    if (timeInterval) clearInterval(timeInterval);
  });

  return {
    contestInfo,
    loading,
    timeRemaining,
    systemTime
  };
}
