import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vueSetupExtend from 'vite-plugin-vue-setup-extend'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const isGhPages = process.env.GITHUB_ACTIONS === 'true'

  // 只暴露 VITE_ 前缀变量，避免把 CI/进程环境中的全部变量注入前端配置
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // 开发代理的后端地址，默认走本地网关 8800
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8800'

  return {
    base: isGhPages && repo ? `/${repo}/` : '/',
    plugins: [
      vue(),
      vueDevTools(),
      vueSetupExtend(),
      AutoImport({
        imports: [
          'vue',
          {
            'naive-ui': [
              'useDialog',
              'useMessage',
              'useNotification',
              'useLoadingBar'
            ]
          }
        ]
      }),
      Components({
        resolvers: [NaiveUiResolver()]
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
        // 题面图片（ProblemImageController 的 /oj/images/{id}/{filename}）指向同一后端，
        // 使后端返回的相对 imageUrl 在开发环境可直接读取；不影响 /api 与 /ws。
        '/oj/images': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
