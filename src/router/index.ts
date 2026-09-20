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
router.beforeEach(async (to) => {
  loadingBar.start()
  const userStore = useUserStore()

  const title = to.meta.title ? `${to.meta.title} - HnieOJ` : 'HnieOJ'
  document.title = title

  // 等待本地 token 从 profile 恢复完成，避免刷新时被误判为未登录
  await userStore.restoreSession()

  // profile 恢复出现网络/服务异常时明确提示；已持有 token 的会话保持可重试，不清理有效 token
  const restoreFailed = userStore.sessionError !== null
  if (restoreFailed) {
    message.error(userStore.sessionError as string)
    userStore.clearSessionError()
  }

  // 常量路由直接放行（游客可访问）
  if (to.meta.constant === true) {
    return true
  }

  // 已登录但 profile 因网络/服务异常未恢复：不用“权限不足”掩盖真实错误，
  // 回到可公开访问的首页，下次导航会再次触发 restoreSession 重试
  if (restoreFailed && userStore.isLogin) {
    loadingBar.error()
    return { name: 'Home' }
  }

  // 登录拦截
  if (!userStore.isLogin) {
    message.warning('请先登录')
    loadingBar.error()
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  const { requireAdmin, roles } = to.meta

  // 后台权限检查
  if (requireAdmin && !userStore.isAdmin) {
    message.error('权限不足，无法访问后台管理系统')
    loadingBar.error()
    return { name: 'Forbidden' }
  }

  // 角色检查：按真实角色列表判断，多角色用户命中任意一个即可
  if (roles && roles.length > 0) {
    const allowed = new Set(roles)
    if (!userStore.userInfo.roles.some((role) => allowed.has(role))) {
      message.error('当前账号权限不足以访问此功能')
      loadingBar.error()
      return { name: 'NotFound' }
    }
  }

  return true
})

router.afterEach(() => {
  loadingBar.finish()
})

router.onError((error) => {
  loadingBar.error()
  console.error('路由导航出错:', error)
})

export default router
