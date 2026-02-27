import { createRouter, createWebHistory } from 'vue-router'
import { createDiscreteApi } from 'naive-ui'
import { routes } from './routers'
import { useUserStore } from '@/stores/userStore'

const { message, loadingBar } = createDiscreteApi(['message', 'loadingBar'])

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_, __, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

/**
 * 全局前置守卫
 */
router.beforeEach((to, _, next) => {
  loadingBar.start()
  const userStore = useUserStore()

  const title = to.meta.title ? `${to.meta.title} - HnieOJ` : 'HnieOJ'
  document.title = title

  // 常量路由直接放行
  if (to.meta.constant === true) {
    next()
    return
  }

  // 登录拦截
  if (!userStore.isLogin) {
    message.warning('请先登录')
    next({ name: 'Login', query: { redirect: to.fullPath } })
    loadingBar.error()
    return
  }

  const { requireAdmin, roles } = to.meta

  // 后台权限检查
  if (requireAdmin && !userStore.isAdmin) {
    message.error('权限不足，无法访问后台管理系统')
    next({ name: 'Forbidden' })
    loadingBar.error()
    return
  }

  // 角色检查
  if (roles && roles.length > 0) {
    const userRole = userStore.userInfo.role
    if (!roles.includes(userRole)) {
      message.error('当前账号权限不足以访问此功能')
      next({ name: 'NotFound' })
      loadingBar.error()
      return
    }
  }

  next()
})

router.afterEach(() => {
  loadingBar.finish()
})

router.onError((error) => {
  loadingBar.error()
  console.error('路由导航出错:', error)
})

export default router
