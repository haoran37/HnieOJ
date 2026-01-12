import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
// v-md-editor
import VMdEditor from '@kangc/v-md-editor';
import '@kangc/v-md-editor/lib/style/base-editor.css';
import VMdPreview from '@kangc/v-md-editor/lib/preview';
import '@kangc/v-md-editor/lib/style/preview.css';
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
import '@kangc/v-md-editor/lib/theme/style/github.css';
import hljs from 'highlight.js';
import createKatexPlugin from '@kangc/v-md-editor/lib/plugins/katex/npm';
import 'katex/dist/katex.css'; 
import createTipPlugin from '@kangc/v-md-editor/lib/plugins/tip/index';
import '@kangc/v-md-editor/lib/plugins/tip/tip.css';
import createCopyCodePlugin from '@kangc/v-md-editor/lib/plugins/copy-code/index';
import '@kangc/v-md-editor/lib/plugins/copy-code/copy-code.css';
import createLineNumbertPlugin from '@kangc/v-md-editor/lib/plugins/line-number/index';
import createAlignPlugin from '@kangc/v-md-editor/lib/plugins/align';

// 通用字体
import 'vfonts/Lato.css'
// 等宽字体
import 'vfonts/FiraCode.css'

// 先加载主题再加载插件
VMdEditor.use(githubTheme, { Hljs: hljs });
VMdEditor.use(createTipPlugin());
VMdEditor.use(createLineNumbertPlugin());
VMdEditor.use(createAlignPlugin());

VMdPreview.use(githubTheme, { Hljs: hljs });
VMdPreview.use(createKatexPlugin());
VMdPreview.use(createCopyCodePlugin());
VMdPreview.use(createTipPlugin());
VMdPreview.use(createLineNumbertPlugin());
VMdPreview.use(createAlignPlugin());

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VMdEditor);
app.use(VMdPreview);

app.mount('#app')
