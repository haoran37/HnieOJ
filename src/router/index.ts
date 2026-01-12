import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routers'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    // 跳转到新页面时滚动到顶部
    return { top: 0 }
  }
})

export default router
