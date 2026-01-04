import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    name: 'Home',
    path: '/',
    meta: { title: '主页' },
    component: () => import('@/views/HomePage/index.vue')
  },
  {
    name: 'Problems',
    path: '/problems',
    meta: { title: '题库' },
    component: () => import('@/views/ProblemsPage/ProblemList.vue')
  },
  {
    name: 'Training',
    path: '/training',
    meta: { title: '题单' },
    component: () => import('@/views/TrainingPage.vue')
  },
  {
    name: 'Contests',
    path: '/contests',
    meta: { title: '竞赛' },
    component: () => import('@/views/ContestsPage.vue')
  },
  {
    name: 'Homework',
    path: '/homework',
    meta: { title: '作业' },
    component: () => import('@/views/HomeworkPage.vue')
  },
  {
    name: 'Status',
    path: '/status',
    meta: { title: '状态' },
    component: () => import('@/views/StatusPage.vue')
  },
  {
    name: 'Rank',
    path: '/rank',
    meta: { title: '排名' },
    component: () => import('@/views/RankPage.vue')
  },
  {
    name: 'WIKI',
    path: '/wiki',
    meta: { title: 'WIKI' },
    component: () => import('@/views/WikiPage.vue')
  },
  {
    name: 'Blog',
    path: '/blog',
    meta: { title: '博客' },
    component: () => import('@/views/BlogPage.vue')
  },
  {
    name: 'Explore',
    path: '/explore',
    meta: { title: '搜索' },
    component: () => import('@/views/ExplorePage.vue')
  }
];
