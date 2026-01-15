import { defineStore } from 'pinia';
import { darkTheme } from 'naive-ui';
import { MobileWidth } from '@/configs';

export type Locale = 'zh' | 'en';

export interface AppState {
  isMobile: boolean;    // 是否为移动端
  darkMode: boolean;    // 是否为暗黑模式
  locale: Locale;       // 语言
  collapsed: boolean;   // 侧边栏是否收缩
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    isMobile: document.body.clientWidth < MobileWidth,
    darkMode: localStorage.getItem('darkMode') === 'true',
    locale: 'zh',
    collapsed: false,
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
  }
});