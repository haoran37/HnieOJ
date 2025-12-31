import { defineStore } from 'pinia';
import { MobileWidth } from '@/configs';

export type Locale = 'zh' | 'en';

export interface AppState {
  isMobile: boolean;    // 是否为移动端
  darkMode: boolean;    // 是否为暗黑模式
  locale: Locale;       // 语言
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    isMobile: document.body.clientWidth < MobileWidth,
    darkMode: sessionStorage.getItem('darkMode') === 'true',
    locale: 'zh',
  }),

  actions: {
    setWidth(width: number) {
      this.isMobile = width < MobileWidth;
    },

    setDarkMode(darkMode: boolean) {
      this.darkMode = darkMode;
      sessionStorage.setItem('darkMode', darkMode.toString());
    },

    setLocale(locale: Locale) {
      this.locale = locale;
    },
  }
});