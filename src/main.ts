import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
// v-md-editor
import VMdPreview from '@kangc/v-md-editor/lib/preview';
import '@kangc/v-md-editor/lib/style/preview.css';
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
import '@kangc/v-md-editor/lib/theme/style/github.css';
import hljs from 'highlight.js';
import createKatexPlugin from '@kangc/v-md-editor/lib/plugins/katex/npm';
import 'katex/dist/katex.css'; 
// 通用字体
import 'vfonts/Lato.css'
// 等宽字体
import 'vfonts/FiraCode.css'

VMdPreview.use(githubTheme, {
  Hljs: hljs,
});

VMdPreview.use(createKatexPlugin());

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VMdPreview);

app.mount('#app')
