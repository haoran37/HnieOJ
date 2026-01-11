import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    name: 'Home',
    path: '/',
    meta: { title: '主页' },
    component: () => import('@/views/HomePage/index.vue')
  },
  {
    name: 'Problem',
    path: '/problem',
    meta: { title: '题库' },
    component: () => import('@/views/ProblemsPage/ProblemList.vue')
  },
  {
    name: 'ProblemDetail',
    path: '/problem/:id',
    meta: { title: '题目详情', hideInMenu: true},
    component: () => import('@/views/ProblemsPage/ProblemDetail.vue')
  },
  {
    name: 'Training',
    path: '/training',
    meta: { title: '题单' },
    component: () => import('@/views/TrainingPage/TrainingList.vue')
  },
  {
    path: '/training/:trainingId',
    meta: {hideInMenu: true},
    component: () => import('@/views/TrainingPage/TrainingDetail.vue'),
    redirect: to => `/training/${to.params.trainingId}/information`,
    children: [
      {
        name: 'TrainingInfo',
        path: 'information',
        meta: { title: '题单简介', hideInMenu: true },
        component: () => import('@/views/TrainingPage/components/TrainingInfo.vue')
      },
      {
        name: 'TrainingProblems',
        path: 'problems',
        meta: { title: '题目列表', hideInMenu: true },
        component: () => import('@/views/TrainingPage/components/TrainingProblems.vue')
      }
    ]
  },
  {
    name: 'Contests',
    path: '/contests',
    meta: { title: '竞赛' },
    component: () => import('@/views/ContestsPage/ContestList.vue')
  },
  {
    path: '/contest/:contestId',
    component: () => import('@/views/ContestsPage/ContestDetail.vue'),
    meta: { hideInMenu: true },
    redirect: to => `/contest/${to.params.contestId}/description`,
    children: [
      {
        name: 'ContestDescription',
        path: 'description',
        meta: { title: '比赛说明', hideInMenu: true },
        component: () => import('@/views/ContestsPage/components/ContestDescription.vue')
      },
      {
        name: 'ContestProblems',
        path: 'problems',
        meta: { title: '题目列表', hideInMenu: true },
        component: () => import('@/views/ContestsPage/components/ContestProblems.vue')
      },
      {
        name: 'ContestScoreboard',
        path: 'scoreboard',
        meta: { title: '排行榜', hideInMenu: true },
        component: () => import('@/views/ContestsPage/components/ContestScoreboard.vue')
      }
    ]
  },
  {
    name: 'Homework',
    path: '/homework',
    meta: { title: '作业' },
    component: () => import('@/views/HomeworkPage/HomeworkList.vue')
  },
  {
    path: '/homework/:homeworkId',
    component: () => import('@/views/HomeworkPage/HomeworkDetail.vue'),
    meta: { hideInMenu: true },
    redirect: to => `/homework/${to.params.homeworkId}/overview`,
    children: [
      {
        name: 'HomeworkOverview',
        path: 'overview',
        meta: { title: '作业概览', hideInMenu: true },
        component: () => import('@/views/HomeworkPage/components/HomeworkOverview.vue')
      },
      {
        name: 'HomeworkProblems',
        path: 'problems',
        meta: { title: '题目列表', hideInMenu: true },
        component: () => import('@/views/HomeworkPage/components/HomeworkProblems.vue')
      },
      {
        name: 'HomeworkRankings',
        path: 'rankings', // 叫 Gradebook 可能更贴切，但为了统一先叫 rankings
        meta: { title: '成绩单', hideInMenu: true },
        component: () => import('@/views/HomeworkPage/components/HomeworkRankings.vue')
      }
    ]
  },
  {
    name: 'Status',
    path: '/status',
    meta: { title: '状态' },
    component: () => import('@/views/StatusPage/StatusList.vue')
  },
{
    path: '/status/:id',
    component: () => import('@/views/StatusPage/StatusDetail.vue'),
    meta: { title: '评测详情', hideInMenu: true },
    children: [
      {
        name: 'StatusInfo',
        path: 'info',
        meta: { title: '测试点信息' },
        component: () => import('@/views/StatusPage/components/StatusInfo.vue')
      },
      {
        name: 'StatusCode',
        path: 'code',
        meta: { title: '源代码' },
        component: () => import('@/views/StatusPage/components/StatusCode.vue')
      }
    ]
  },
  {
    name: 'Rank',
    path: '/rank',
    meta: { title: '排名' },
    component: () => import('@/views/RankPage.vue')
  },
  {
    name: 'News',
    path: '/news',
    meta: { title: '新闻', hideInMenu: true },
    component: () => import('@/views/NewsPage/NewsList.vue')
  },
  {
    path: '/news/:id',
    component: () => import('@/views/NewsPage/NewsDetail.vue'),
    meta: { title: '新闻详情', hideInMenu: true }
  },
  {
    name: 'Discuss',
    path: '/discuss',
    meta: { title: '讨论' },
    component: () => import('@/views/DiscussPage/DiscussList.vue')
  },
    {
    name: 'DiscussDetail',
    path: '/discuss/:id',
    meta: { title: '讨论详情', hideInMenu: true },
    component: () => import('@/views/DiscussPage/DiscussDetail.vue')
  },
  {
    name: 'WIKI',
    path: '/wiki',
    meta: { title: 'WIKI' },
    component: () => import('@/views/WikiPage.vue')
  },
  {
    name: 'Explore',
    path: '/explore',
    meta: { title: '探索' },
    component: () => import('@/views/ExplorePage.vue')
  }
];
