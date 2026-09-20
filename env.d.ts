/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API 基础地址，留空表示同源
  readonly VITE_API_BASE_URL?: string
  // Vite 开发代理的后端地址（默认 http://localhost:8800）
  readonly VITE_BACKEND_URL?: string
}

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

declare module '@kangc/v-md-editor/lib/plugins/tip/index' {
  const createTipPlugin: () => any;
  export default createTipPlugin;
}

declare module '@kangc/v-md-editor' {
  import type { DefineComponent } from 'vue';
  
  const VMdEditor: DefineComponent<{}, {}, any> & {
    use(theme: any, config?: any): void;
    install(app: any): void;
  };
  
  export default VMdEditor;
}

declare module '@kangc/v-md-editor/lib/plugins/line-number/index';
declare module '@kangc/v-md-editor/lib/plugins/copy-code/index';
declare module '@kangc/v-md-editor/lib/plugins/align';