import { defineStore } from 'pinia';
import { darkTheme } from 'naive-ui';
import { MobileWidth } from '@/configs';
import { getPublicConfig, getSystemTime } from '@/utils/api';

export type Locale = 'zh' | 'en';

// 来自 /api/system/public-config 与 /api/system/time 的真实系统信息
export interface AppSystemInfo {
  websiteName: string | null;
  logoUrl: string | null;
  icpCode: string | null;
  allowRegister: boolean | null;
  registerMode: string | null;
  serverTimezone: string | null;
  // 服务端时间 - 本地时间（毫秒），用于按服务端时间展示倒计时/日历
  serverTimeOffset: number;
  systemLoaded: boolean;
  systemError: string | null;
}

export interface AppState extends AppSystemInfo {
  isMobile: boolean;    // 是否为移动端
  darkMode: boolean;    // 是否为暗黑模式
  locale: Locale;       // 语言
  collapsed: boolean;   // 侧边栏是否收缩
}

const initialSystemInfo: AppSystemInfo = {
  websiteName: null,
  logoUrl: null,
  icpCode: null,
  allowRegister: null,
  registerMode: null,
  serverTimezone: null,
  serverTimeOffset: 0,
  systemLoaded: false,
  systemError: null,
};

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    isMobile: document.body.clientWidth < MobileWidth,
    darkMode: localStorage.getItem('darkMode') === 'true',
    locale: 'zh',
    collapsed: false,
    ...initialSystemInfo,
  }),

  getters: {
    naiveTheme(state) {
      return state.darkMode ? darkTheme : null;
    }
  },

  actions: {
    setWidth(width: number) {
      this.isMobile = width < MobileWidth;
    },

    setDarkMode(darkMode: boolean) {
      this.darkMode = darkMode;
      localStorage.setItem('darkMode', darkMode.toString());
    },

    toggleDarkMode() {
      this.setDarkMode(!this.darkMode);
    },

    toggleSider() {
      this.collapsed = !this.collapsed;
    },

    setLocale(locale: Locale) {
      this.locale = locale;
    },

    /** 服务端当前时间（已按服务端偏移校正） */
    serverNow(): Date {
      return new Date(Date.now() + this.serverTimeOffset);
    },

    /**
     * 读取系统公开配置与服务端时间。
     * 只调用后端确有的 /api/system/public-config 与 /api/system/time。
     */
    async fetchSystemInfo() {
      this.systemError = null;
      try {
        const [config, time] = await Promise.all([getPublicConfig(), getSystemTime()]);
        this.websiteName = config?.websiteName ?? null;
        this.logoUrl = config?.logoUrl ?? null;
        this.icpCode = config?.icpCode ?? null;
        this.allowRegister = config?.allowRegister ?? null;
        this.registerMode = config?.registerMode ?? null;

        const serverMs =
          time?.unixTimestamp !== null && time?.unixTimestamp !== undefined
            ? time.unixTimestamp * 1000
            : time?.serverTime
              ? new Date(time.serverTime).getTime()
              : Number.NaN;
        this.serverTimeOffset = Number.isFinite(serverMs) ? serverMs - Date.now() : 0;
        this.serverTimezone = time?.timezone ?? null;
        this.systemLoaded = true;
      } catch (err) {
        this.systemError = err instanceof Error ? err.message : '系统信息加载失败';
      }
    },
  }
});
