import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  // 前台路由
  {
    path: '/',
    component: () => import('@/layouts/OjLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        meta: { title: '主页' },
        component: () => import('@/views/oj/HomePage/index.vue')
      },
      {
        path: 'problem',
        name: 'ProblemList',
        meta: { title: '题库' },
        component: () => import('@/views/oj/ProblemsPage/ProblemList.vue')
      },
      {
        path: 'problem/:id',
        name: 'ProblemDetail',
        meta: { title: '题目详情', hideInMenu: true, activeMenu: 'ProblemList' },
        component: () => import('@/views/oj/ProblemsPage/ProblemDetail.vue')
      },
      {
        path: 'training',
        name: 'TrainingList',
        meta: { title: '题单' },
        component: () => import('@/views/oj/TrainingPage/TrainingList.vue')
      },
      {
        path: 'training/:trainingId',
        name: 'TrainingDetail',
        meta: { hideInMenu: true, activeMenu: 'TrainingList' },
        component: () => import('@/views/oj/TrainingPage/TrainingDetail.vue'),
        redirect: to => `/training/${to.params.trainingId}/information`,
        children: [
          {
            name: 'TrainingInfo',
            path: 'information',
            meta: { title: '题单简介', hideInMenu: true, activeMenu: 'TrainingList' },
            component: () => import('@/views/oj/TrainingPage/components/TrainingInfo.vue')
          },
          {
            name: 'TrainingProblems',
            path: 'problems',
            meta: { title: '题目列表', hideInMenu: true, activeMenu: 'TrainingList' },
            component: () => import('@/views/oj/TrainingPage/components/TrainingProblems.vue')
          }
        ]
      },
      {
        path: 'contests',
        name: 'ContestsList',
        meta: { title: '竞赛' },
        component: () => import('@/views/oj/ContestsPage/ContestList.vue')
      },
      {
        path: 'contest/:contestId',
        name: 'ContestDetail',
        component: () => import('@/views/oj/ContestsPage/ContestDetail.vue'),
        meta: { hideInMenu: true, activeMenu: 'ContestsList' },
        redirect: to => `/contest/${to.params.contestId}/description`,
        children: [
          {
            name: 'ContestDescription',
            path: 'description',
            meta: { title: '比赛说明', hideInMenu: true, activeMenu: 'ContestsList' },
            component: () => import('@/views/oj/ContestsPage/components/ContestDescription.vue')
          },
          {
            name: 'ContestProblems',
            path: 'problems',
            meta: { title: '题目列表', hideInMenu: true, activeMenu: 'ContestsList' },
            component: () => import('@/views/oj/ContestsPage/components/ContestProblems.vue')
          },
          {
            name: 'ContestScoreboard',
            path: 'scoreboard',
            meta: { title: '排行榜', hideInMenu: true, activeMenu: 'ContestsList' },
            component: () => import('@/views/oj/ContestsPage/components/ContestScoreboard.vue')
          }
        ]
      },
      {
        path: 'homework',
        name: 'HomeworkList',
        meta: { title: '作业' },
        component: () => import('@/views/oj/HomeworkPage/HomeworkList.vue')
      },
      {
        path: 'homework/:homeworkId',
        name: 'HomeworkDetail',
        component: () => import('@/views/oj/HomeworkPage/HomeworkDetail.vue'),
        meta: { hideInMenu: true, activeMenu: 'HomeworkList' },
        redirect: to => `/homework/${to.params.homeworkId}/overview`,
        children: [
          {
            name: 'HomeworkOverview',
            path: 'overview',
            meta: { title: '作业概览', hideInMenu: true, activeMenu: 'HomeworkList' },
            component: () => import('@/views/oj/HomeworkPage/components/HomeworkOverview.vue')
          },
          {
            name: 'HomeworkProblems',
            path: 'problems',
            meta: { title: '题目列表', hideInMenu: true, activeMenu: 'HomeworkList' },
            component: () => import('@/views/oj/HomeworkPage/components/HomeworkProblems.vue')
          },
          {
            name: 'HomeworkRankings',
            path: 'rankings',
            meta: { title: '成绩单', hideInMenu: true, activeMenu: 'HomeworkList' },
            component: () => import('@/views/oj/HomeworkPage/components/HomeworkRankings.vue')
          }
        ]
      },
      {
        path: 'status',
        name: 'StatusList',
        meta: { title: '状态' },
        component: () => import('@/views/oj/StatusPage/StatusList.vue')
      },
      {
        path: 'status/:id',
        name: 'StatusDetail',
        component: () => import('@/views/oj/StatusPage/StatusDetail.vue'),
        meta: { title: '评测详情', hideInMenu: true, activeMenu: 'StatusList' },
        children: [
          {
            name: 'StatusInfo',
            path: 'info',
            meta: { title: '测试点信息', activeMenu: 'StatusList' },
            component: () => import('@/views/oj/StatusPage/components/StatusInfo.vue')
          },
          {
            name: 'StatusCode',
            path: 'code',
            meta: { title: '源代码', activeMenu: 'StatusList' },
            component: () => import('@/views/oj/StatusPage/components/StatusCode.vue')
          }
        ]
      },
      {
        path: 'rank',
        name: 'Rank',
        meta: { title: '排名' },
        component: () => import('@/views/oj/RankPage.vue')
      },
      {
        path: 'news',
        name: 'NewsList',
        meta: { title: '新闻', hideInMenu: true },
        component: () => import('@/views/oj/NewsPage/NewsList.vue')
      },
      {
        path: 'news/:id',
        name: 'NewsDetail',
        component: () => import('@/views/oj/NewsPage/NewsDetail.vue'),
        meta: { title: '新闻详情', hideInMenu: true }
      },
      {
        path: 'discuss',
        name: 'DiscussList',
        meta: { title: '讨论' },
        component: () => import('@/views/oj/DiscussPage/DiscussList.vue')
      },
      {
        path: 'discuss/:id',
        name: 'DiscussDetail',
        meta: { title: '讨论详情', hideInMenu: true, activeMenu: 'DiscussList' },
        component: () => import('@/views/oj/DiscussPage/DiscussDetail.vue')
      },
      {
        path: 'user/:uid',
        component: () => import('@/views/oj/UserPage/UserLayout.vue'),
        meta: { title: '用户中心', hideInMenu: true },
        redirect: to => `/user/${to.params.uid}/home`,
        children: [
          {
            path: 'home',
            name: 'UserHome',
            meta: { title: '主页' },
            component: () => import('@/views/oj/UserPage/views/UserHome.vue')
          },
          {
            path: 'homework',
            name: 'UserHomework',
            meta: { title: '作业' },
            component: () => import('@/views/oj/UserPage/views/UserHomework.vue')
          },
          {
            path: 'contest',
            name: 'UserContest',
            meta: { title: '比赛' },
            component: () => import('@/views/oj/UserPage/views/UserContest.vue')
          },
          {
            path: 'training',
            name: 'UserTraining',
            meta: { title: '题单' },
            component: () => import('@/views/oj/UserPage/views/UserTraining.vue')
          },
          {
            path: 'discuss',
            name: 'UserDiscuss',
            meta: { title: '讨论' },
            component: () => import('@/views/oj/UserPage/views/UserDiscuss.vue')
          },
          {
            path: 'message',
            name: 'UserMessage',
            meta: { title: '消息' },
            component: () => import('@/views/oj/UserPage/views/UserMessage.vue')
          },
          {
            path: 'setting',
            name: 'UserSetting',
            meta: { title: '设置' },
            component: () => import('@/views/oj/UserPage/views/UserSetting.vue')
          }
        ]
      },
      {
        path: 'wiki',
        name: 'WIKI',
        meta: { title: 'WIKI' },
        component: () => import('@/views/oj/WikiPage.vue')
      },
      {
        path: 'explore',
        name: 'Explore',
        meta: { title: '探索' },
        component: () => import('@/views/oj/ExplorePage.vue')
      }
    ]
  },

  // 后台路由
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/layouts/AdminLayout.vue'), 
    meta: { title: '后台管理', requireAdmin: true },
    redirect: '/admin/dashboard',
    children: [
      {
        name: 'AdminDashboard',
        path: 'dashboard',
        meta: { title: '仪表盘' },
        component: () => import('@/views/admin/Dashboard/index.vue')
      }
      // ...
    ]
  },

  // 独立页面
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/login.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue')
  }
];