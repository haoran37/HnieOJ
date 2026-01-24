import type { RouteRecordRaw } from 'vue-router';
import { 
  SpeedometerOutline, NewspaperOutline, PeopleOutline, 
  ListOutline, FileTrayFullOutline, TrophyOutline, 
  BookOutline, ChatbubblesOutline, ConstructOutline 
} from '@vicons/ionicons5';
import { shallowRef } from 'vue';

const icon = (c: any) => shallowRef(c);

export const ojRouters: RouteRecordRaw = {
  path: '/',
  component: () => import('@/layouts/OjLayout.vue'),
  children: [
    {
      path: '',
      name: 'Home',
      meta: { title: '主页', constant: true },
      component: () => import('@/views/oj/HomePage/index.vue')
    },
    {
      path: 'problem',
      name: 'ProblemList',
      meta: { title: '题库', constant: true },
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
      meta: { title: '题单', constant: true },
      component: () => import('@/views/oj/TrainingPage/TrainingList.vue')
    },
    {
      path: 'training/:trainingId',
      name: 'TrainingDetail',
      meta: { title: '题单详情', hideInMenu: true, activeMenu: 'TrainingList' },
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
      meta: { title: '竞赛', constant: true },
      component: () => import('@/views/oj/ContestsPage/ContestList.vue')
    },
    {
      path: 'contest/:contestId',
      name: 'ContestDetail',
      component: () => import('@/views/oj/ContestsPage/ContestDetail.vue'),
      meta: { title: '竞赛详情', hideInMenu: true, activeMenu: 'ContestsList' },
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
      meta: { title: '作业', constant: true },
      component: () => import('@/views/oj/HomeworkPage/HomeworkList.vue')
    },
    {
      path: 'homework/:homeworkId',
      name: 'HomeworkDetail',
      component: () => import('@/views/oj/HomeworkPage/HomeworkDetail.vue'),
      meta: { title: '作业详情', hideInMenu: true, activeMenu: 'HomeworkList' },
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
      meta: { title: '状态', constant: true },
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
      meta: { title: '新闻', hideInMenu: true, constant: true },
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
      meta: { title: '讨论', constant: true },
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
      redirect: to => `/user/${to.params.uid}`,
      children: [
        {
          path: '',
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
      meta: { title: 'WIKI', constant: true },
      component: () => import('@/views/oj/WikiPage.vue')
    },
    {
      path: 'explore',
      name: 'Explore',
      meta: { title: '探索', constant: true },
      component: () => import('@/views/oj/ExplorePage.vue')
    }
  ]
}

export const adminRouters: RouteRecordRaw = {
  path: '/admin',
  component: () => import('@/layouts/AdminLayout.vue'), 
  meta: { title: '后台管理', requireAdmin: true },
  children: [
    {
      path: '',
      name: 'AdminDashboard',
      meta: { title: '仪表盘', icon: icon(SpeedometerOutline) },
      component: () => import('@/views/admin/Dashboard/index.vue')
    },
    {
      path: 'content',
      name: 'ContentManage',
      meta: { title: '资讯管理', icon: icon(NewspaperOutline) },
      children: [
        {
          path: 'announcement',
          name: 'AdminAnnouncement',
          meta: { title: '公告管理' },
          component: () => import('@/views/admin/ContentManage/Announcement.vue') },
        {
          path: 'news',
          name: 'AdminNews',
          meta: { title: '新闻管理' },
          component: () => import('@/views/admin/ContentManage/News.vue') },
        {
          path: 'notification',
          name: 'AdminNotice',
          meta: { title: '通知管理' },
          component: () => import('@/views/admin/ContentManage/Notice.vue') },
      ]
    },
    {
      path: 'user',
      name: 'UserManage',
      meta: { title: '用户管理', icon: icon(PeopleOutline) },
      children: [
        {
          path: 'list',
          name: 'AdminUserList',
          meta: { title: '用户列表' },
          component: () => import('@/views/admin/UserManage/UserList.vue') },
        {
          path: 'registration',
          name: 'AdminUserRegistration',
          meta: { title: '注册申请' },
          component: () => import('@/views/admin/UserManage/Registration.vue') },
        {
          path: 'changes',
          name: 'AdminUserChange',
          meta: { title: '变动申请' },
          component: () => import('@/views/admin/UserManage/Change.vue') },
        {
          path: 'achievement',
          name: 'AdminUserAchievement',
          meta: { title: '成就申请' },
          component: () => import('@/views/admin/UserManage/Achievement.vue') },
        {
          path: 'permission',
          name: 'AdminPermission',
          meta: { title: '权限管理' },
          component: () => import('@/views/admin/UserManage/Permission.vue') },
      ]
    },
    {
      path: 'problem',
      name: 'ProblemManage',
      meta: { title: '题目管理', icon: icon(ListOutline) },
      children: [
        {
          path: 'list',
          name: 'AdminProblemList',
          meta: { title: '题目列表' },
          component: () => import('@/views/admin/ProblemManage/ProblemList/index.vue') },
        {
          path: 'add',
          name: 'AdminProblemAdd',
          meta: { title: '添加题目', hideInMenu: true, activeMenu: 'AdminProblemList' },
          component: () => import('@/views/admin/ProblemManage/ProblemList/components/ProblemAdd.vue') },
        {
          path: 'edit/:id',
          name: 'AdminProblemEdit',
          meta: { title: '编辑题目', hideInMenu: true, activeMenu: 'AdminProblemList' },
          component: () => import('@/views/admin/ProblemManage/ProblemList/components/ProblemEdit.vue') },
        {
          path: 'tag',
          name: 'AdminProblemTag',
          meta: { title: '标签管理' },
          component: () => import('@/views/admin/ProblemManage/Tag.vue') },
        {
          path: 'rejudge',
          name: 'AdminProblemRejudge',
          meta: { title: '重判题目' },
          component: () => import('@/views/admin/ProblemManage/Rejudge.vue') },
      ]
    },
    {
      path: 'training',
      name: 'TrainingManage',
      meta: { title: '题单管理', icon: icon(FileTrayFullOutline) },
      children: [
        {
          path: 'list',
          name: 'AdminTrainingList',
          meta: { title: '题单列表' },
          component: () => import('@/views/admin/TrainingManage/TrainingList/index.vue')
        },
        {
          path: 'add',
          name: 'AdminTrainingAdd',
          meta: { title: '添加题单', hideInMenu: true, activeMenu: 'AdminTrainingList' },
          component: () => import('@/views/admin/TrainingManage/TrainingList/components/TrainingAdd.vue')
        },
        {
          path: 'edit/:id',
          name: 'AdminTrainingEdit',
          meta: { title: '编辑题单', hideInMenu: true, activeMenu: 'AdminTrainingList' },
          component: () => import('@/views/admin/TrainingManage/TrainingList/components/TrainingEdit.vue')
        }
      ]
    },
    {
      path: 'contest',
      name: 'ContestManage',
      meta: { title: '比赛管理', icon: icon(TrophyOutline) },
      children: [
        {
          path: 'list',
          name: 'AdminContestList',
          meta: { title: '比赛列表' },
          component: () => import('@/views/admin/ContestManage/ContestList/index.vue') },
        {
          path: 'add',
          name: 'AdminContestAdd',
          meta: { title: '添加比赛', hideInMenu: true, activeMenu: 'AdminContestList' },
          component: () => import('@/views/admin/ContestManage/ContestList/components/ContestAdd.vue') },
        {
          path: 'edit/:id',
          name: 'AdminContestEdit',
          meta: { title: '编辑比赛', hideInMenu: true, activeMenu: 'AdminContestList' },
          component: () => import('@/views/admin/ContestManage/ContestList/components/ContestEdit.vue') },
        {
          path: 'team',
          name: 'AdminContestTeam',
          meta: { title: '比赛队伍管理' },
          component: () => import('@/views/admin/ContestManage/TeamManage.vue') },
        {
          path: 'achievement',
          name: 'AdminContestAchievement',
          meta: { title: '添加比赛成就' },
          component: () => import('@/views/admin/ContestManage/Achievement.vue') },
      ]
    },
    {
      path: 'homework',
      name: 'HomeworkManage',
      meta: { title: '作业管理', icon: icon(BookOutline) },
      children: [
        {
          path: 'list',
          name: 'AdminHomeworkList',
          meta: { title: '作业列表' },
          component: () => import('@/views/admin/HomeworkManage/HomeworkList.vue')
        },
        {
          path: 'add',
          name: 'AdminHomeworkAdd',
          meta: { title: '添加作业', hideInMenu: true, activeMenu: 'AdminHomeworkList' },
          component: () => import('@/views/admin/HomeworkManage/HomeworkAdd.vue')
        },
        {
          path: 'edit/:id',
          name: 'AdminHomeworkEdit',
          meta: { title: '编辑作业', hideInMenu: true, activeMenu: 'AdminHomeworkList' },
          component: () => import('@/views/admin/HomeworkManage/HomeworkEdit.vue')
        }
      ]
    },
    {
      path: 'discuss',
      name: 'DiscussManage',
      meta: { title: '讨论管理', icon: icon(ChatbubblesOutline) },
      component: () => import('@/views/admin/DiscussManage/index.vue')
    },
    {
      path: 'system',
      name: 'SystemManage',
      meta: { title: '系统管理', icon: icon(ConstructOutline) },
      children: [
        {
          path: 'status',
          name: 'AdminSystemStatus',
          meta: { title: '系统状态' },
          component: () => import('@/views/admin/SystemManage/Status.vue') },
        {
          path: 'service',
          name: 'AdminService',
          meta: { title: '服务管理' },
          component: () => import('@/views/admin/SystemManage/Service.vue') },
        {
          path: 'config',
          name: 'AdminConfig',
          meta: { title: '系统配置' },
          component: () => import('@/views/admin/SystemManage/Config.vue') },
      ]
    }
  ]
}

export const routes: RouteRecordRaw[] = [
  // 前台路由
  ojRouters,
  // 后台路由
  adminRouters,
  // 独立页面
  {
    path: '/login',
    name: 'Login',
    meta: { title: '登录', constant: true },
    component: () => import('@/views/auth/login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    meta: { title: '注册', constant: true},
    component: () => import('@/views/auth/register.vue')
  },
  {
    path: '/403',
    name: 'Forbidden',
    meta: { title: '无访问权限', constant: true },
    component: () => import('@/views/error/403.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    meta: { title: '404', constant: true},
    component: () => import('@/views/error/404.vue')
  },
];
