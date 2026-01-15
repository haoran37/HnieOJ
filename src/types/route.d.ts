import 'vue-router';
import type { Component } from 'vue';

declare module 'vue-router' {
  interface RouteMeta {
    title: string;           // 菜单/面包屑
    icon?: Component | any;  // 图标组件
    hideInMenu?: boolean;    // 是否隐藏
    constant?: boolean;      // 是否是常量路由
    requireAdmin?: boolean;  // 是否需要后台权限
    roles?: string[];        // 允许访问的角色
    activeMenu?: string;     // 详情页高亮父级菜单 key
    order?: number;          // 排序
  }
}