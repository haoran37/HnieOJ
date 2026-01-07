/// <reference types="vite/client" />

// src/v-md-editor.d.ts
declare module '@kangc/v-md-editor/lib/preview' {
  import type { DefineComponent } from 'vue';
  const VMdPreview: DefineComponent<{}, {}, any> & {
    use(theme: any, config?: any): void;
    install(app: any): void;
  };
  export default VMdPreview;
}

declare module '@kangc/v-md-editor/lib/theme/github.js' {
  const theme: any;
  export default theme;
}

declare module '@kangc/v-md-editor/lib/plugins/katex/npm' {
  const createKatexPlugin: () => any;
  export default createKatexPlugin;
}

declare module '@kangc/v-md-editor/lib/plugins/line-number/index';
declare module '@kangc/v-md-editor/lib/plugins/copy-code/index';