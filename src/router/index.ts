import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routers';
import { useUserStore } from '@/stores/userStore';
import { createDiscreteApi } from 'naive-ui';

const { message, loadingBar } = createDiscreteApi(['message', 'loadingBar']);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
});

/**
 * 全局前置守卫
 */
router.beforeEach((to, from, next) => {
  loadingBar.start();
  const userStore = useUserStore();
  
  const title = to.meta.title ? `${to.meta.title} - HnieOJ` : 'HnieOJ';
  document.title = title;

  // ---------------------------------------------------------
  // 常量路由检查
  // ---------------------------------------------------------
  if (to.meta.constant === true) {
    next();
    return;
  }

  // ---------------------------------------------------------
  // 全局登录拦截
  // ---------------------------------------------------------
  if (!userStore.isLogin) {
    message.warning('请先登录');
    next({ name: 'Login', query: { redirect: to.fullPath } });
    loadingBar.error();
    return;
  }

  // ---------------------------------------------------------
  // 权限与角色检查
  // ---------------------------------------------------------
  const { requireAdmin, roles } = to.meta;

  // A. 检查后台管理权限
  if (requireAdmin) {
    if (!userStore.isAdmin) {
      message.error('权限不足，无法访问后台管理系统');
      next({ name: 'Forbidden' });
      loadingBar.error();
      return;
    }
  }

  // B. 检查具体角色
  if (roles && roles.length > 0) {
    const userRole = userStore.userInfo.role;
    if (!roles.includes(userRole)) {
      message.error('当前账号权限不足以访问此功能');
      next({ name: 'NotFound' });
      loadingBar.error();
      return;
    }
  }

  next();
});

router.afterEach(() => {
  loadingBar.finish();
});

router.onError((error) => {
  loadingBar.error();
  console.error('路由导航出错:', error);
});

export default router;