# HNIEOJ 全业务 API 对接清单（117 项 Apifox 文档）

本清单逐条覆盖冻结的 `all-apis.json` 117 项接口，并补充后端已有增补路由。
字段以后端当前 DTO/VO 为准（文档 response schema 多为空）。

- 生成来源：`all-apis.json` / `api-inventory.json` / `backend-routes.json`（只读冻结输入）。
- 状态含义：**已接线** = 前端真实页面/请求已对接；**部分接线** = 仅局部；**未接线** = 本批未覆盖；**节点/内部** = 非浏览器调用；**已废弃** = 后端已移除；**已退休** = 旧流程停用（旧 controller 可能仍保留路由并显式拒绝，或仅余无消费方的空写路径），能力由 Bootstrap + Ed25519 + WSS 取代；**后端缺失** = 文档有但后端无实现。
- 后端网关目前除登录/注册/system 公开接口外均要求登录；页面避免对受保护数据反复请求造成重定向。

## A. 117 项逐条清单

| # | 方法 路径 | 前端入口/调用位置 | 后端 Controller | 状态 | 差异/备注 |
|---|-----------|------------------|-----------------|------|-----------|
| 1 | POST `/api/auth/login` | src/stores/userStore.ts login()（views/auth/login.vue 表单） | AuthController | 已接线 | uid/password 与后端一致 |
| 2 | POST `/api/auth/register` | src/views/auth/register.vue | AuthController | 已接线 | 三个注册查询由后端另批放行 |
| 3 | GET `/api/user/profile` | src/stores/userStore.ts loadProfile() | UserProfileController | 已接线 |  |
| 4 | GET `/api/user/users` | src/utils/api.ts searchUsers()（HomePage/components/UserSearchBox.vue 用户查询） | UserProfileController | 已接线 | 支持 keyword/collegeId/grade/classId/page/pageSize |
| 5 | GET `/api/user/users/{uid}` | src/utils/api.ts getUserDetail()（UserPage/components/UserSideBar.vue） | UserProfileController | 已接线 | 用户资料页真实读取 |
| 6 | GET `/api/user/check` | src/utils/api.ts checkUser()（UserList.vue 行内「查验」按钮） | UserLookupController | 已接线 | 参数名 `query`（uid/用户名），页面真实调用 |
| 7 | POST `/api/users` | src/composables/admin/useUserManage.ts handleAddUser()（UserList.vue 添加） | UserManageController | 已接线 | CreateUserRequest{uid,username,email,password?,phone?,avatar?,collegeId,classId,grade}；成功后重读列表，未传密码时展示 initialPassword |
| 8 | PUT `/api/users/{uid}` | useUserManage.ts handleEditSubmit() | UserManageController | 已接线 | UpdateUserRequest{username,email?,status(0/1),collegeId,classId,grade}；失败保留表单并显示错误 |
| 9 | PUT `/api/users/{uid}/password` | useUserManage.ts handlePasswordSubmit() | UserManageController | 已接线 | {password}；管理员重置 |
| 10 | DELETE `/api/users/{uid}` | useUserManage.ts handleDelete() | UserManageController | 已接线 | 单条删除 |
| 11 | PUT `/api/users/batch/disable` | useUserManage.ts handleBatchDisable() | UserManageController | 已接线 | {uids} |
| 12 | PUT `/api/users/batch/enable` | useUserManage.ts handleBatchEnable() | UserManageController | 已接线 | {uids} |
| 13 | DELETE `/api/users/batch` | useUserManage.ts handleBatchDelete() | UserManageController | 已接线 | DELETE body{uids} |
| 14 | GET `/api/admin/permission/users` | usePermissionManage.ts fetchPermissionUsers()（Permission.vue） | AdminPermissionController | 已接线 | page/pageSize 服务端分页；返回全部真实 roles（多角色不丢失） |
| 15 | GET `/api/admin/users/search` | usePermissionManage.ts handleSearch()（Permission.vue 添加弹窗） | AdminPermissionController | 已接线 | query 必填；页面实际使用 |
| 16 | POST `/api/admin/permission/grant` | usePermissionManage.ts handleAddSubmit() | AdminPermissionController | 已接线 | {uids,role}；role 仅 ADMIN/TEACHER/TA（大小写不敏感，源码按 RoleConstant 归一） |
| 17 | PUT `/api/admin/permission/update` | usePermissionManage.ts handleEditSubmit() | AdminPermissionController | 已接线 | {uid,role} |
| 18 | DELETE `/api/admin/permission/revoke` | usePermissionManage.ts handleDelete() | AdminPermissionController | 已接线 | query 参数 uid |
| 19 | DELETE `/api/admin/permission/batch-revoke` | usePermissionManage.ts handleBatchDelete() | AdminPermissionController | 已接线 | {uids} |
| 20 | GET `/api/registrations` | useRegistration.ts fetchRegistrations()（Registration.vue） | RegistrationReviewController | 已接线 | status 0/1/2 + keyword 服务端分页 |
| 21 | POST `/api/registrations/{uid}/approve` | useRegistration.ts handleApprove() | RegistrationReviewController | 已接线 |  |
| 22 | POST `/api/registrations/{uid}/reject` | useRegistration.ts handleRejectSubmit() | RegistrationReviewController | 已接线 | {reason} 真实原因 |
| 23 | POST `/api/registrations/batch/approve` | useRegistration.ts handleBatchApprove() | RegistrationReviewController | 已接线 | {uids}，返回成功/失败汇总 |
| 24 | GET `/api/users/import/template` | `src/composables/admin/useUserManage.ts handleDownloadTemplate()`（鉴权 Blob 下载） | UserManageController（源码已提供；冻结 backend-routes.json 未收录） | 已接线 | 后端源码已有该路由（xlsx，需 USER_MANAGE）；冻结路由清单缺失，后续后端批补齐 |
| 25 | GET `/api/users/{uid}/achievements` | src/utils/api.ts getUserAchievements()（UserSideBar.vue） | UserAchievementController | 已接线 | 成就列表分页 |
| 26 | POST `/api/achievements/apply` | src/utils/api.ts submitAchievementApply()（UserSetting.vue） | AchievementApplyController | 已接线 | multipart title/description/file，真实报错 |
| 27 | POST `/api/admin/users/{uid}/achievements` | useUserManage.ts handleAddAchievement()（UserList 成就弹窗）、ContestManage/Achievement.vue | AdminUserAchievementController | 已接线 | {title?,content,proofUrl?,achieveTime?} |
| 28 | DELETE `/api/admin/users/{uid}/achievements/{achievementId}` | useUserManage.ts handleDeleteAchievement()、ContestManage/Achievement.vue | AdminUserAchievementController | 已接线 |  |
| 29 | GET `/api/admin/achievements` | useAchievementManage.ts fetchList()（UserManage/Achievement.vue） | AdminAchievementApplyController | 已接线 | keyword/status(pending/approved/rejected)/college(学院id) |
| 30 | POST `/api/admin/achievements/{id}/approve` | useAchievementManage.ts handleApprove() | AdminAchievementApplyController | 已接线 |  |
| 31 | POST `/api/admin/achievements/{id}/reject` | useAchievementManage.ts handleRejectSubmit() | AdminAchievementApplyController | 已接线 | {reason} |
| 32 | GET `/api/colleges/{college}/grades` | src/utils/api.ts getGrades()（register.vue） | BaseDataController | 已接线 |  |
| 33 | GET `/api/colleges` | src/utils/api.ts getColleges()（register.vue） | BaseDataController | 已接线 |  |
| 34 | GET `/api/colleges/{college}/grades/{grade}/classes` | src/utils/api.ts getClasses()（register.vue） | BaseDataController | 已接线 |  |
| 35 | GET `/api/classes/{classId}/teachers` | src/utils/api.ts getClassTeachers()（UserList.vue 编辑/新增表单选中班级后只读展示） | BaseDataController | 已接线 | 与 #36 成对调用；加载序号作废旧班级请求，不写假师资 |
| 36 | GET `/api/classes/{classId}/tas` | src/utils/api.ts getClassTas()（同 #35 表单只读展示助教名单） | BaseDataController | 已接线 | 本批补齐 tas 入口 |
| 37 | GET `/api/problems` | src/composables/oj/useProblemsList.ts（ProblemList.vue） | ProblemController | 已接线 | 仅支持 keyword/tags/difficulty；source/searchInContent 后端无参数，已移除 |
| 38 | GET `/api/problems/{problemCode}` | src/views/oj/ProblemsPage/ProblemDetail.vue | ProblemController | 已接线 | 详情 VO 不含 tags，标签区留空 |
| 39 | GET `/api/problems/check` | src/utils/api.ts checkProblem()（题单内部 ID → 展示编号） | ProblemController | 已接线 | problemId 为内部数字 ID |
| 40 | GET `/api/problems/{id}/testdata/download` | src/utils/api.ts downloadProblemTestdata()（StatusInfo.vue） | ProblemController | 已接线 | 使用内部 problem.id，鉴权 Blob + 业务错误处理 |
| 41 | GET `/api/problems/{id}/testdata/{caseNo}/download` | src/utils/api.ts downloadProblemTestCase()（StatusInfo.vue） | ProblemController | 已接线 | 使用内部 problem.id 与 caseNo |
| 42 | GET `/api/admin/problem/list` | src/composables/admin/useProblemManage.ts fetchProblems()（ProblemList/index.vue，remote 服务端分页 + keyword/auth） | AdminProblemController | 已接线 | page/pageSize/keyword/auth；列表返回内部 id + problemCode |
| 43 | POST `/api/admin/problem` | useProblemForm.ts handleSubmit()（ProblemAdd.vue） | AdminProblemController | 已接线 | AddProblemRequest{problem,tags}；成功后按 problemCode 回查真实内部 id 再进入编辑页上传资源 |
| 44 | PUT `/api/admin/problem` | useProblemForm.ts handleSubmit()（ProblemEdit.vue） | AdminProblemController | 已接线 | UpdateProblemRequest{problem,tags}；编辑前先用 GET /api/admin/problem/{id} 回填完整 DTO（含 SPJ/交互题） |
| 45 | DELETE `/api/admin/problem` | useProblemManage.ts handleDelete()（ProblemList/index.vue） | AdminProblemController | 已接线 | DELETE body{pid}；成功后重读列表 |
| 46 | PUT `/api/admin/problem/auth` | useProblemManage.ts handleAuthChange()（ProblemList 行内可见范围） | AdminProblemController | 已接线 | body{pid,auth}；后端仅接受 1 公开/2 私有，auth=3（比赛）需在编辑表单设置 |
| 47 | POST `/api/admin/problem/{id}/testdata` | useProblemForm.ts handleUploadTestdata()（ProblemEdit.vue 测试数据卡片） | AdminProblemController | 已接线 | multipart file=ZIP；仅对真实内部 id 上传 |
| 48 | POST `/api/admin/problem/{id}/images` | useProblemForm.ts handleUploadImage()（ProblemEdit.vue 题面图片卡片） | AdminProblemController | 已接线 | multipart file；真实返回 `/oj/images/{id}/{filename}` 并插入题面 |
| 49 | DELETE `/api/admin/problem/{id}/images/{filename}` | useProblemForm.ts handleDeleteImage()（ProblemEdit.vue） | AdminProblemController | 已接线 | 使用题面中解析出的真实 filename，删除后重读详情 |
| 50 | POST `/api/submissions` | src/views/oj/ProblemsPage/components/ProblemSubmit.vue | SubmissionController | 已接线 | JSON{problemCode,language,code,contestId} 或 multipart file+contestId；language 仅 cpp/c/java/python |
| 51 | GET `/api/submissions` | src/composables/oj/useStatusList.ts（StatusList.vue） | SubmissionController | 已接线 | 筛选 status 用数字；列表 VO 无题目标题 |
| 52 | GET `/api/submissions/{submissionId}` | src/composables/oj/useStatusDetail.ts（StatusDetail.vue） | SubmissionController | 已接线 | 卸载/同ID刷新作废在途请求，MAX_POLLS 显式，错误可重试 |
| 53 | GET `/api/submissions/{submissionId}/cases` | src/composables/oj/useStatusDetail.ts | SubmissionController | 已接线 | caseId 字符串，下载用序号 |
| 54 | POST `/api/admin/submissions/{submissionId}/rejudge` | src/composables/oj/useStatusDetail.ts rejudge() | AdminSubmissionController | 已接线 | 真实 POST 后刷新 |
| 55 | GET `/api/admin/submissions/judge-outbox` | src/views/admin/SystemManage/Status.vue（outbox 列表） | AdminSubmissionController | 已接线 | page/pageSize/status/submissionId/judgeTaskId；remote 分页 |
| 56 | POST `/api/admin/submissions/judge-outbox/{id}/retry` | src/views/admin/SystemManage/Status.vue（行内重试） | AdminSubmissionController | 已接线 | 已发送(sent)后端返回 400，UI 禁用；成功后重读列表 |
| 57 | POST `/api/admin/submissions/rejudge-tasks` | src/composables/admin/useRejudge.ts | AdminSubmissionController | 已接线 | {problemCode,rangeStart,rangeEnd} |
| 58 | GET `/api/admin/submissions/rejudge-tasks` | src/composables/admin/useRejudge.ts | AdminSubmissionController | 已接线 |  |
| 59 | POST `/api/judge/temp-token` | 判题节点入口（非浏览器调用） | JudgeNodeAuthController | 已退休 | 旧 controller 仍保留该路由并显式返回 403（「临时令牌兑换已退休」）；临时节点改走 `POST /api/admin/judge/nodes/bootstrap-tokens`（nodeType=temp）+ Ed25519 注册与 WSS 认证 |
| 60 | POST `/api/admin/judge/nodes/auth-codes` | 不调用 | AdminJudgeNodeController | 已退休 | 旧 controller 仍保留该路由（写入的授权码已无兑换消费方）；前端不再调用，正式/临时节点统一改用 `POST /api/admin/judge/nodes/bootstrap-tokens` |
| 61 | POST `/api/admin/judge/nodes/formal-token/rotate` | 不调用 | AdminJudgeNodeController（FormalJudgeTokenService） | 已退休 | 旧 controller 仍保留该路由并显式返回 403（RETIRED_MESSAGE）；正式节点改走 `POST /api/admin/judge/nodes/bootstrap-tokens`（nodeType=formal） |
| 62 | GET `/api/admin/judge/nodes/tokens` | src/composables/admin/useJudgeNodes.ts fetchTokens() | AdminJudgeNodeController | 已接线 |  |
| 63 | POST `/api/admin/judge/nodes/tokens/{tokenId}/revoke` | src/composables/admin/useJudgeNodes.ts revokeToken() | AdminJudgeNodeController | 已接线 |  |
| 64 | GET `/api/admin/judge/nodes` | src/composables/admin/useJudgeNodes.ts fetchNodes() | AdminJudgeNodeController | 已接线 | 展示在线/心跳/并发(maxConcurrency)/到期(expireTime)/支持模式；VO 不含 authorizationUntil/draining |
| 65 | GET `/api/contests` | src/composables/oj/useContests.ts（ContestList.vue） | ContestController | 已接线 | 分页 + type(ACM/OI)；无内外部/自主筛选参数 |
| 66 | GET `/api/contests/{id}` | src/composables/oj/useContestDetail.ts（ContestDetail.vue） | ContestController | 已接线 | 详情含 problems（内部 problemId/displayId/displayTitle） |
| 67 | GET `/api/contests/check` | src/utils/api.ts checkContest()（useTeamManage.ts handleCidChange() 切换比赛时真实查验） | ContestController | 已接线 | 回传 {valid,contestId,title}；无效比赛不请求队伍列表 |
| 68 | GET `/api/admin/contest/list` | src/composables/admin/useContestManage.ts fetchContests()（ContestList/index.vue，remote 服务端分页 + keyword） | AdminContestController | 已接线 | 列表 VO status 为布尔、type 为 ACM/OI、auth 为 Public/Private |
| 69 | POST `/api/admin/contest` | useContestForm() handleSubmit()（ContestAdd.vue） | AdminContestController | 已接线 | startTime/endTime 毫秒 epoch；problems[{problemId 数字, displayId A/B}]；accountList 为 uid 数组 |
| 70 | PUT `/api/admin/contest/{id}` | useContestForm() handleSubmit()（ContestEdit.vue） | AdminContestController | 已接线 | 编辑前经 GET /api/admin/contest/{id} 回填完整详情；失败保留表单 |
| 71 | DELETE `/api/admin/contest` | useContestManage.ts handleDelete()（ContestList/index.vue） | AdminContestController | 已接线 | query 参数 id= |
| 72 | PUT `/api/admin/contest/status` | useContestManage.ts handleToggleStatus() | AdminContestController | 已接线 | body{id,status:boolean}；成功后重读列表 |
| 73 | GET `/api/admin/contest/{id}` | useContestForm() loadData()（ContestEdit.vue） | AdminContestController | 已接线 | 返回 timeRange(ms)、problems（内部 problemId + String displayId）、accountList |
| 74 | GET `/api/admin/contest/team` | useTeamManage.ts fetchTeams()（TeamManage.vue，比赛下拉 cid + remote 分页） | AdminContestController | 已接线 | 必需 cid/page/pageSize；无 cid 时不发请求 |
| 75 | POST `/api/admin/contest/team` | useTeamManage.ts handleSubmit()（添加队伍） | AdminContestController | 已接线 | {cid,name,member1Uid,member2Uid?,member3Uid?}；后端校验成员 UID 真实存在 |
| 76 | PUT `/api/admin/contest/team/{id}` | useTeamManage.ts handleSubmit()（编辑队伍） | AdminContestController | 已接线 | 后端不支持变更所属比赛；成员 UID 重复返回 400 |
| 77 | DELETE `/api/admin/contest/team/{id}` | useTeamManage.ts handleDelete() | AdminContestController | 已接线 | 成功后重读列表 |
| 78 | DELETE `/api/admin/contest/team` | useTeamManage.ts handleBatchDelete() | AdminContestController | 已接线 | DELETE 带 body{ids:[数字]} |
| 79 | GET `/api/trainings` | src/composables/oj/useTrainingList.ts（TrainingList.vue） | TrainingController | 已接线 | keyword/type(Official/User)/auth 分页 |
| 80 | GET `/api/trainings/{id}/information` | src/composables/oj/useTrainingDetail.ts（TrainingDetail.vue） | TrainingController | 已接线 | 无收藏/评分/进度接口，已移除假数据 |
| 81 | GET `/api/trainings/{id}/problems` | src/composables/oj/useTrainingProblems.ts（TrainingProblems.vue） | TrainingController | 已接线 | displayId Integer>=1；内部 problemId 经 checkProblem 换展示编号 |
| 82 | GET `/api/admin/training/list` | src/composables/admin/useTrainingManage.ts fetchTrainings()（TrainingList/index.vue，remote 分页 + keyword） | AdminTrainingController | 已接线 | status 为布尔；type Official/User；auth Public/Private |
| 83 | POST `/api/admin/training` | useTrainingForm() handleSubmit()（TrainingAdd.vue） | AdminTrainingController | 已接线 | AdminTrainingProblemRequest.displayId 为 Integer>=1；私有题单必须带 privatePwd |
| 84 | PUT `/api/admin/training/{id}` | useTrainingForm() handleSubmit()（TrainingEdit.vue） | AdminTrainingController | 已接线 | 编辑使用受保护 GET /api/admin/training/{id} 完整详情，保留 privatePwd/description；displayId Integer，不能发送 A/B |
| 85 | DELETE `/api/admin/training` | useTrainingManage.ts handleDelete() | AdminTrainingController | 已接线 | query 参数 id= |
| 86 | PUT `/api/admin/training/status` | useTrainingManage.ts handleToggleStatus() | AdminTrainingController | 已接线 | body{id,status:boolean}；成功后重读列表 |
| 87 | GET `/api/homeworks` | src/composables/oj/useHomeworkList.ts（HomeworkList.vue） | HomeworkController | 已接线 | 仅 keyword + 分页；学院/年级/班级/教师筛选接口不支持，界面禁用并显示「暂未开放」，不发送无效参数 |
| 88 | GET `/api/homeworks/{id}` | src/composables/oj/useHomeworkDetail.ts（HomeworkDetail.vue/HomeworkProblems.vue） | HomeworkController | 已接线 | 详情含 problems（内部 problemId + String displayId） |
| 89 | GET `/api/admin/homework/list` | src/composables/admin/useHomeworkManage.ts fetchHomeworks()（HomeworkList/index.vue，remote 分页 + keyword） | AdminHomeworkController | 已接线 | status 为布尔 |
| 90 | POST `/api/admin/homework` | useHomeworkForm() handleSubmit()（HomeworkAdd.vue） | AdminHomeworkController | 已接线 | classIds 为数字数组；displayId 为 String(A/B)；startTime/endTime 毫秒 |
| 91 | PUT `/api/admin/homework/{id}` | useHomeworkForm() handleSubmit()（HomeworkEdit.vue） | AdminHomeworkController | 已接线 | 编辑前经 GET /api/admin/homework/{id} 回填数字 classIds 与 A/B 题目；失败保留表单 |
| 92 | DELETE `/api/admin/homework` | useHomeworkManage.ts handleDelete() | AdminHomeworkController | 已接线 | query 参数 id= |
| 93 | PUT `/api/admin/homework/status` | useHomeworkManage.ts handleToggleStatus() | AdminHomeworkController | 已接线 | body{id,status:boolean}；成功后重读列表 |
| 94 | GET `/api/admin/homework/{id}` | useHomeworkForm() loadData()（HomeworkEdit.vue） | AdminHomeworkController | 已接线 | 受保护完整详情：classIds 数字、timeRange(ms)、problems（内部 problemId + String displayId） |
| 95 | GET `/api/discussions` | src/composables/oj/useDiscussList.ts（DiscussList.vue/RecentDiscussions.vue） | DiscussionController | 已接线 | category/keyword/sort 服务端分页 |
| 96 | GET `/api/discussions/{id}` | src/composables/oj/useDiscussDetail.ts（DiscussDetail.vue） | DiscussionController | 已接线 | post+answers+comments |
| 97 | POST `/api/discussions/{type}/{id}/vote` | src/composables/oj/useDiscussDetail.ts handleVote() | DiscussionController | 已接线 | direction up/down；成功后重取详情 |
| 98 | POST `/api/discussions` | src/composables/oj/useDiscussAdd.ts（DiscussAdd.vue） | DiscussionController | 已接线 | title/category/problemCode/content；创建不接受 isTop（后端对 isTop=true 返回 403），置顶由管理端编辑设置 |
| 99 | POST `/api/discussions/{postId}/answers` | src/composables/oj/useDiscussDetail.ts submitAnswer() | DiscussionController | 已接线 | 成功后重取详情 |
| 100 | POST `/api/discussions/answers/{answerId}/comments` | src/composables/oj/useDiscussDetail.ts submitComment() | DiscussionController | 已接线 | 成功后重取详情 |
| 101 | GET `/api/discussions/related` | src/utils/api.ts getRelatedDiscussions()（ProblemDetail.vue） | DiscussionController | 已接线 |  |
| 102 | GET `/api/admin/discussions` | src/composables/admin/useDiscussManage.ts（DiscussList.vue，remote 分页 + keyword/category/status） | AdminDiscussionController | 已接线 | category 仅 Site/Problem；status 0 正常/1 关闭 |
| 103 | PUT `/api/admin/discussions/{id}` | useDiscussManage.ts handleSaveEdit()（DiscussList 编辑弹窗） | AdminDiscussionController | 已接线 | {title,category,problemCode,content,status,isTop}；编辑前经 GET /api/admin/discussions/{id} 读取完整详情 |
| 104 | DELETE `/api/admin/discussions/{id}` | useDiscussManage.ts handleDelete() | AdminDiscussionController | 已接线 | 成功后重读列表 |
| 105 | GET `/api/announcements` | src/composables/oj/useNewsList.ts（NewsList.vue 传 `category=NEWS`；AnnouncementCard.vue 不传 category 保持旧行为） | AnnouncementController | 已接线 | keyword 分页 + 可选 category（ANNOUNCEMENT/NEWS）；无浏览量字段 |
| 106 | GET `/api/announcements/{id}` | src/composables/oj/useNewsDetail.ts（NewsDetail.vue） | AnnouncementController | 已接线 | 只读；admin 编辑删除属另一批 |
| 107 | GET `/api/admin/announcements` | src/composables/admin/useAnnouncement.ts（ContentManage/Announcement.vue 固定 ANNOUNCEMENT；ContentManage/News.vue 经 useAdminNews 固定 NEWS，remote 分页 + keyword/status/category） | AdminAnnouncementController | 已接线 | 字段 title/content/status（0 下线/1 上线）+ category（缺省 ANNOUNCEMENT） |
| 108 | POST `/api/admin/announcements` | useAnnouncement.ts handleSubmit()（Announcement.vue / News.vue 新建） | AdminAnnouncementController | 已接线 | {title,content,status,category} 带对应分类 |
| 109 | PUT `/api/admin/announcements/{id}` | useAnnouncement.ts handleSubmit()（Announcement.vue / News.vue 编辑） | AdminAnnouncementController | 已接线 | 编辑前经 GET /api/admin/announcements/{id} 读取 content/status/category（下线公告也可编辑）；保存带对应 category；成功后重读列表 |
| 110 | DELETE `/api/admin/announcements/{id}` | useAnnouncement.ts handleDelete() | AdminAnnouncementController | 已接线 | 成功后重读列表 |
| 111 | PUT `/api/admin/announcements/{id}/status` | useAnnouncement.ts toggleStatus()（Announcement.vue 上线/下线） | AdminAnnouncementController | 已接线 | {status} 0/1；成功后重读列表 |
| 112 | GET `/api/system/public-config` | src/stores/app.ts fetchSystemInfo()（TopNavi.vue/PageFooter.vue） | SystemController | 已接线 | websiteName/logoUrl/icpCode/registerMode |
| 113 | GET `/api/system/time` | src/stores/app.ts fetchSystemInfo() | SystemController | 已接线 | serverTime/timezone/unixTimestamp -> 服务端偏移 |
| 114 | GET `/api/admin/config` | src/composables/admin/useSystemConfig.ts fetchConfig()（Config.vue） | AdminSystemConfigController | 已接线 | registerMode 原样保留 OPEN/EMAIL_SUFFIX/INVITE_CODE，不静默转换 |
| 115 | PUT `/api/admin/config` | src/composables/admin/useSystemConfig.ts saveConfig() | AdminSystemConfigController | 已接线 | smtpPassword 留空整键省略以保留旧值；保存成功后重新 GET 确认 |
| 116 | GET `/api/admin/judge/account` | src/composables/admin/useSystemConfig.ts（Config.vue 远程评测账号）/ useJudgeNodes.ts | AdminJudgeController | 已接线 | 真实列表；新增/编辑/删除见 B 节 |
| 117 | POST `/api/admin/judge/token/reset` | 不调用 | —（后端无此路由） | 已退休 | 保留 117 原始条目索引；共享主 Token 已废弃，改用 `POST /api/admin/judge/nodes/bootstrap-tokens` 一次性签发注册凭据 |

## B. 后端存在但不在 117 文档的增补路由

| 方法 路径 | 消费端/前端入口 | 说明 |
|-----------|----------------|------|
| POST `/api/admin/judge/nodes/bootstrap-tokens` | `useJudgeNodes.ts createBootstrapToken()`（Service.vue「签发注册凭据」） | 正式/临时节点统一一次性签发 Bootstrap：`{nodeType(formal/temp),nodeName,maxConcurrency(1..1000),supportedJudgeModes(default/spj/interactive),weight(1..100),expiresAt(epoch 毫秒，≤30 天),authorizationUntil(epoch 毫秒，temp 必填且必须为未来),remark}`；响应 `NodeBootstrapVo{authCodeId,bootstrapToken,nodeType,expiresAt}`，明文只返回一次 |
| GET `/api/admin/problem/{id}` | `useProblemForm.ts fetchDetail()`（ProblemEdit.vue） | **本批新增（不计入 117 项）**：返回 `AdminProblemDetailVo{problem:完整 ProblemRequest, tags:string[]}`，供编辑回填 SPJ/交互程序、限制、`isRemoveEndBlank` 等公共 VO 不含字段；有 `PROBLEM_UPDATE` 保护 |
| GET `/api/admin/discussions/{id}` | `useDiscussManage.ts openEditModal()`（DiscussList 编辑弹窗） | **本批新增（不计入 117 项）**：`Result<{id,title,category,problemCode,content,status,isTop}>`，仅 ADMIN/ROOT，正常/关闭讨论都返回真实内容且不计浏览量 |
| GET `/api/admin/announcements/{id}` | `useAnnouncement.ts openEditModal()`（Announcement.vue 编辑） | **本批新增（不计入 117 项）**：`Result<AnnouncementDetailVo>`（id/title/content/uid/status/gmtCreate/gmtModified），仅 ADMIN/ROOT，上线/下线都可读 |
| POST `/api/admin/judge/nodes/tokens/{tokenId}/drain`、`/enable`、`/disable`、`/policy`、`/revoke` | `useJudgeNodes.ts drainNode()/enableNode()/revokeToken()`（Service.vue 行内操作） | 节点生命周期（ADMIN/ROOT）：`drain` 停止新调度、`enable` 恢复 active、`disable` 禁用并提升 accessVersion、`policy` 调整并发/权重/模式/授权截止、`revoke` 吊销；响应 `JudgeNodeTokenVo`。前端以 `status === draining` 展示排空，以 `maxConcurrency`/`expireTime` 展示并发与到期，已吊销/硬到期不提供恢复入口 |
| GET `/api/admin/achievements/{id}/file` | `useAchievementManage.ts handleDownloadFile()`（成就申请详情/列表按钮） | 本地附件受保护下载（Bearer Blob，带鉴权）；外部 http(s) fileUrl 仍以链接展示，不做服务端代理 |
| GET `/api/admin/training/{id}` | `useTrainingForm.ts loadData()`（TrainingEdit.vue） | **本批新增（不计入 117 项）**：`Result<AdminTrainingDetailVo{id,title,type,auth,privatePwd,description,status(boolean),rank,problems[{problemId,displayId(Integer)}]}>`，仅 ADMIN/ROOT，停用/私有题单不受启用过滤且返回 privatePwd 与全部有序题目 |
| GET `/api/admin/judge/servers` | 前端节点管理使用 `/api/admin/judge/nodes` | 兼容投影：`AdminJudgeServerController.listServers` 直接投影 `judgeNodeSecurityService.listTokens(null)`，与已接线 `nodes` 同源，不是独立旧服务器数据源；前端不为重复字段新增页面 |
| GET `/api/problems/{id}/testdata/download`、`/{caseNo}/download` | `StatusInfo.vue`、`ProblemEdit.vue` 测试数据卡片 | 角色 TEACHER/ADMIN/ROOT；ProblemEdit 也提供真实管理入口（上传 POST `/api/admin/problem/{id}/testdata`、下载全部/单个测试点） |
| POST `/api/admin/rejudge`、GET `/api/admin/rejudge/list`、GET `/api/admin/rejudge/{taskId}/details` | `useRejudge.ts` 使用新路径 `/api/admin/submissions/rejudge-tasks` 与 `/api/admin/rejudge/{id}/details` | legacy 创建接口保留 |
| POST `/api/submissions`（multipart） | `ProblemSubmit.vue` 文件上传 | `problemCode/language/file/contestId` |
| `POST /api/judge/temp-token`、`/judge/*`、`/internal/*` | 判题机（go-judge）节点 | 非浏览器调用；`temp-token` 为旧 controller 显式 403 退休路由，节点改走 `/api/admin/judge/nodes/bootstrap-tokens` + Ed25519 + WSS。节点只有本地 config + identity，沙箱不挂载私钥，节点不直连 Nacos/Redis；受众/HTTPS/WSS 以后端 `docs/judge-ops.md` 为准 |
| GET `/api/tags` | `useTags.ts`（TagSelectModal.vue）/ `useTagManage.ts`（ProblemManage/Tag.vue） | **B1 新增（不计入 117 项）**：真实标签目录，按真实 category 分组，category=source 映射「来源」，空分类归「未分类」；题目查询/编辑仍用 name 字符串 |
| POST/PUT/DELETE `/api/admin/tags` | `useTagManage.ts`（ProblemManage/Tag.vue） | **B1 新增（不计入 117 项）**：ADMIN/ROOT + `problem:create/update/delete`；名称必填 ≤50、color ≤20、category ≤50；删除被引用标签返回业务错误并原样提示 |
| GET `/api/problems/{problemCode}/recommendations?limit=5` | `ProblemDetail.vue` 推荐题目侧栏 | **B1 新增（不计入 117 项）**：公开题按标签/难度推荐；空显示「暂无推荐」，失败可重试；按 problemCode 导航，旧响应作废 |
| POST/PUT/DELETE `/api/admin/judge/account`、`/{id}` | `useSystemConfig.ts`（Config.vue 远程评测账号） | **B1 新增（不计入 117 项）**：账号 CRUD；密码只写不读，编辑初始为空、留空保留、非空原样提交；仅账号管理，不代表已实现外站代交 |

## C. 无文档且后端无 API 的缺失能力（AC6，保留页面并禁用/空状态）

| 能力 | 现状处理 |
|------|---------|
| 通知管理独立分类/定向推送 | **已接线（B2）**：`ContentManage/Notice.vue` + `useNotice.ts` 完成真实分页/筛选、草稿 CRUD、显式收件目标（用户查询 / 学院-年级-班级）与发布确认；已发布只读，删除只删管理记录。公告/新闻分类见 Announcement.vue / News.vue |
| 比赛排行榜/名次、报名 | 后端无路由；`useContestScoreboard.ts` 与 ContestScoreboard.vue 标注「暂未开放」，不展示 mock |
| 作业成绩单/排名 | 后端无路由；`useHomeworkRankings.ts` 与 HomeworkRankings.vue 标注「暂未开放」 |
| 全站排行榜、比赛内排名 | 后端无路由；`useRankList.ts` / RankPage.vue 标注「暂未开放」 |
| 首页 Top 评分/Top 贡献/月度排名 | 后端无路由；对应卡片标注「暂未开放」，不展示随机数据 |
| 用户个人题单/比赛/作业/讨论 | 后端列表接口不支持 uid 过滤；UserTraining/UserContest/UserHomework/UserDiscuss 标注「暂未开放」，不用全站数据冒充 |
| 用户消息 | **已接线（B2）**：`useUserMessages.ts` + `UserMessage.vue` 支持分页、全部/未读过滤、未读数、单条/全部已读、删除确认；仅本人可见（route uid 与本人 uid 比较，非本人不可访问），失败不伪 0 |
| 收藏/评分/历史统计 | 后端无自助接口；UserHome/UserSideBar 统计区标注「暂未开放」，UserHome「已通过/尝试过的题目」不再显示 0 题或「暂无本地记录」 |
| 自助资料/密码/身份变更申请 | **已接线（B2）**：`useUserSettings.ts` + `UserSetting.vue` 真实加载 `GET /api/user/profile`，只提交白名单字段；密码走 `PUT /api/user/password`，成功后清理本地会话并跳转登录；实名/学院/年级/班级走变更申请并展示本人申请分页。收藏/评分仍暂未开放 |
| 用户信息变更审核（「变动申请」页） | **已接线（B2）**：`useUserChange.ts` + `Change.vue` 走真实分页/状态/关键字，行 key 为申请 id，仅 PENDING 可审核、原因必填，冲突保留错误并刷新真实状态；已移除 disabled 占位批量按钮 |
| 成就附件本地/外部区分 | 本地存储：`fileUrl` 为受保护路径 `/api/admin/achievements/{id}/file`，前端 Bearer 下载为 Blob；外部仅 http(s) 以链接打开，不把 local key 当链接、也不走服务端代理 |
| 注册开关/注册模式执行缺口 | `registerMode` 已按后端合法枚举（OPEN/EMAIL_SUFFIX/INVITE_CODE）保存与回读，但 user 模块未读取 allowRegister/registerMode，RegisterRequest 无 inviteCode；Config.vue 明确提示该设置当前不影响实际注册，不虚构邀请码注册已生效 |
| 共享主 Judge Token 重置 | 已退休，改用 Bootstrap 一次性注册凭据（Service.vue `POST /api/admin/judge/nodes/bootstrap-tokens`）+ Ed25519 注册 |
| 后台仪表盘历史趋势/判题分布/热点统计 | 后端无相应接口；`useDashboard.ts` 取用户/题目/题单/比赛/作业/提交列表的真实 `total`（真实 0 显示 0），任一接口读取失败显示「加载失败」并提供重新加载，不沿用旧成功值、也不伪装「暂未开放」；增长趋势、提交结果分布、热门/冷门题目、活跃题单仍显示「暂未开放」，不用随机统计 |
| 比赛模式独立大屏 | 后端无 `/api/special/contest-mode` 等赛事信息/独立开关接口；`useContestMode.ts` 不伪造赛事名称、倒计时或节点时延，页面仅展示真实服务端时间并明确「比赛模式暂未开放」 |

## D. 关键字段与单位约定

- 题目 `timeLimit` 单位 ms；`memoryLimit`/`stackLimit` 单位 MB（详情页按 MB 展示）。
- 提交 `time` 单位 ms、`memory` 单位 KB。
- 提交状态 `status` 为整数（`SubmissionStatusConstant`：-10 待处理/-9 编译中/-8 运行中/0 AC/1 RE/2 CE/3 WA/4 TLE/5 MLE/6 SE/7 JF/8 Invalid Interaction）。
- 提交请求仅发送 `problemCode/language/code` 或 `problemCode/language/file/contestId`，绝不把内部 `problem.id` 当展示编号。
- 题单题目只返回内部 `problemId`，导航前必须调用 `GET /api/problems/check?problemId=` 获取展示编号。
- `AdminTrainingProblemRequest.displayId` 为 Integer>=1；比赛/作业 `displayId` 为 String。
- 分页统一 `{list,total}`（后端 `PageVo`）。
- 用户 `status` 为 0 正常 / 1 禁用（`UserStatusConstant`）；注册申请 `status` 为 0 待处理 / 1 通过 / 2 驳回（`RegisterStatus`）；成就申请 `status` 为 pending/approved/rejected。
- `/api/user/users` 仅支持 keyword/collegeId/grade/classId 服务端筛选；UserList.vue 已移除后端不支持的邮箱/角色/状态/注册时间筛选，不再用当页数据冒充全局筛选。
- `registerMode` 必须原样提交后端 `SystemConfigConstant.REGISTER_MODE_SET`（OPEN/EMAIL_SUFFIX/INVITE_CODE），否则 `PUT /api/admin/config` 返回 400；`smtpPassword` 后端不回显，留空即省略以保留旧值。
- 题目 `judgeMode` 取值 `default`/`spj`/`interactive`；`type` 为 0 ACM / 1 OI；`difficulty` 为 0 简单 / 1 中等 / 2 困难（`ProblemDifficultyConstant`）。
- 题目 `auth` 为 1 公开 / 2 私有 / 3 仅比赛（`ProblemAuthConstant`）；`PUT /api/admin/problem/auth` 后端仅接受 1/2，auth=3 通过新增/编辑接口设置。
- 题目 `source` 在后端为单个字符串（非数组）；`tags` 为 `string[]`，通过 `AddProblemRequest/UpdateProblemRequest` 的 `tags` 字段保存。
- 管理讨论 `status` 为 0 正常 / 1 关闭；`category` 仅 `Site`/`Problem`（`DiscussionStatusConstant`/`DiscussionCategoryConstant`）；`topPriority>0` 表示置顶。
- 公告 `status` 为 0 下线 / 1 上线（`AnnouncementStatusConstant`）；`category` 为 `ANNOUNCEMENT`（缺省）/ `NEWS`，前台列表/详情只返回上线记录，管理端详情可读下线记录。
- 标签 `TagVo{id,name,color,category}`：题目列表筛选与题目新增/编辑的 `tags` 仍是 `name` 字符串数组，不换成 id；标签目录 `GET /api/tags` 与题目 tags 字段同源。
- 判题 outbox `status` 为小写 `pending`/`processing`/`sent`/`failed`/`exhausted`（`JudgeTaskOutboxStatusConstant`）；`sent` 记录调用 retry 后端返回 400，UI 必须禁用。
- 服务端列表 `{list,total}` 绑定 `n-data-table` 时必须设置 `remote`，否则 Naive UI 会忽略 `total` 按当页条数分页。
- 比赛 `type` 仅 `ACM`/`OI`（`ContestTypeConstant`，`IOI` 归一为 `OI`）；`auth`/`permission` 仅 `Public`/`Private`（`ContestAuthConstant`，两者同源），没有 Internal/External。
- 比赛/题单/作业 `status` 均为布尔；时间字段 `startTime/endTime` 为毫秒 epoch；列表时间展示由后端 `LocalDateTime` 字符串提供。
- 题单 `type` 仅 `Official`/`User`（`TrainingTypeConstant`），`auth` 仅 `Public`/`Private`（`TrainingAuthConstant`）；`auth=Private` 时 `privatePwd` 必填，编辑必须先用 `GET /api/admin/training/{id}` 取回原密码。
- 作业 `classIds` 为数字数组（后端 `@Min(1)`）；作业表单的学院→年级→班级选项来自 `GET /api/colleges`、`/api/colleges/{id}/grades`、`/api/colleges/{id}/grades/{grade}/classes`，没有“专业”维度。
- 比赛限定账号请求为 `accountList: string[]`（uid），详情返回 `accountList[{uid,username}]`；账号查验使用 `GET /api/user/check?query=`。

## E. 本批行为回归

- `scripts/verify-admin-content.mjs`：真实实例化 `useProblemForm`/`useAnnouncement`/`useDiscussManage`/`useDiscussAdd`，受控 HTTP 覆盖草稿保护、旧响应隔离、管理端详情映射、空 examples 保存、`total>pageSize` 第二页与创建不发送 `isTop`。运行：`node scripts/verify-admin-content.mjs`。
- `scripts/verify-admin-business.mjs`：真实实例化本批 `useContestForm`/`useContestList`/`useTrainingForm`/`useHomeworkForm`/`useTeamManage`，受控 HTTP 覆盖题目按 `problemId` 数字查验、比赛/作业 String(A/B) 与训练 Integer displayId、账号重复/401 保留输入、PUT 失败保留表单、作业数字 classIds 与旧年级响应隔离、队伍成员 UID 与批量删除 body、`total>pageSize` 第二页，并回归记录切换竞态（详情元数据迟到、失败详情不得保存旧表单、迟到题目添加不跨记录、旧保存不得卡住新记录保存态）、题目的上/下移交换 `displayId` 后按编号排序持久化与仅改标题不重排、队伍迟到查验/A→B→A 不清空当前列表、公开 check 无效时回退管理详情（停用比赛仍可管理，404 才停止）、关闭弹窗后延迟校验不得提交、编辑表单详情未加载完成前不渲染、比赛模式系统时间本地时区格式化。运行：`node scripts/verify-admin-business.mjs`。
- `scripts/verify-final-status.mjs`：实例化真实 `userStore` 与 `useDashboard`，覆盖未查询到做题记录返回未知（不伪称「未开始」/0 题、AC/WA 映射保留）、仪表盘真实 `total=0` 显示 0、接口读取失败标记 error 且不沿用旧成功值、重新加载成功后恢复。运行：`node scripts/verify-final-status.mjs`。
- `scripts/verify-judge-nodes.mjs`（节点安全批次新增）：受控 HTTP 覆盖正式/临时节点统一 `POST /api/admin/judge/nodes/bootstrap-tokens` 的严格 DTO、`/tokens/{tokenId}/drain` 与 `/enable`、`/revoke` 生命周期路由、会话代号作废在途旧响应、同一会话并发列表读取「最新响应才可写入」，并真实转译 `Service.vue` 的 `<script setup>` 做组件级行为回归：切换账号/关闭签发弹窗作废迟到凭据、切会话后迟到的排空与吊销确认不再刷新或发请求、旧签发 `finally` 不得清除新签发提交态、生命周期成功但回读失败时提示「已提交但刷新失败」而非谎报成功；同时做源码级约束：不得再调用已退休 `formal-token`/`auth-codes`/`draining` 路由，列表只读 `maxConcurrency`/`expireTime`、排空以 `status === draining` 判定，注册凭据不写浏览器存储、不打印。运行：`node scripts/verify-judge-nodes.mjs`。
- `scripts/verify-auth.mjs`、`scripts/verify-business.mjs` 同样以受控 HTTP 桩（替换 `globalThis.fetch`）验证认证/业务请求契约，不依赖真实后端；`scripts/verify-admin-users.mjs`、`scripts/verify-oj-composables.mjs`、`scripts/verify-oj-rework.mjs`、`scripts/verify-final-status.mjs` 也均为仓库内可直接运行的受控 HTTP 或源码回归。真实后端联调需另行启动服务，不属于以上脚本。
- `scripts/verify-remaining-b1.mjs`（B1 批次新增）：受控 HTTP 覆盖标签目录/管理、推荐、远程评测账号、公告/新闻的真实 API 路径与参数、推荐旧响应作废、密码 payload 空保留/非空原样、分类、加载失败不伪空、保存期间重复提交防护；并编译 `ProblemDetail.vue` 的 `<script setup>` 直接实例化，验证推荐请求竞态。运行：`node scripts/verify-remaining-b1.mjs`。

## F. 本轮（用户查询 / 比赛成就）记录

本轮完成两项前端接线：`UserSearchBox.vue` 在既有 `keyword`/`page`/`pageSize` 基础上支持 `collegeId`/`grade`/`classId` 联动筛选、服务端分页与显式用户选择；`ContestManage/Achievement.vue` 支持真实用户查询与显式选择、成就列表分页、新增/删除，并保留前往成就申请审核入口，用户绑定、竞态与失败保留按组件回归覆盖。以上已做组件/API 契约测试（`scripts/verify-user-search.mjs`、`scripts/verify-contest-achievement.mjs`）和类型检查/lint，均在受控 HTTP 桩下运行、不依赖真实后端；本轮未进行真实浏览器联调与真实后端新功能验收。所有其他剩余功能待 API/schema/dependency 方案授权后再实施，不虚构完成。

## G. B1 批次（标签/推荐/远程账号/新闻）

本批接通四项剩余能力，均使用后端已实现的 B1 接口（见 `backend-api-b1.md`），不新增依赖、不改后端：

- 标签目录/管理：`TagSelectModal.vue` 读取真实 `GET /api/tags` 并按 category 分组（source 映射「来源」，空分类「未分类」）；`ProblemManage/Tag.vue` 完成真实 CRUD、本地分页（真实条数，不伪造 total）、删除确认与被引用错误提示；加载失败显示错误并可重试，不被当成空目录。
- 推荐题目：`ProblemDetail.vue` 调用 `GET /api/problems/{encodedCode}/recommendations?limit=5`；独立的加载/空/错误状态，切换题目同步清空并作废旧请求，按 problemCode 导航且可用键盘操作；题目详情成功不再清掉推荐。
- 远程评测账号：`SystemManage/Config.vue` 增加新建/编辑/删除确认；密码只写不读，编辑初始为空、留空保留、非空原样提交（不 trim），保存期间禁用切换与重复提交并捕获 id/payload 快照；删除后重读列表，列表失败明确报错。
- 新闻：`ContentManage/News.vue` 复用 `useAnnouncement('NEWS')`（`useAdminNews.ts` 薄封装），`Announcement.vue` 固定 ANNOUNCEMENT；前台 `NewsList.vue` 只请求 `category=NEWS` 且搜索后翻页保留关键词，`NewsDetail.vue` 真实读取并沿用现有 Markdown 呈现；首页 `AnnouncementCard.vue` 不传 category，旧调用行为不变。

自测：`node scripts/verify-remaining-b1.mjs`、`node scripts/verify-business.mjs`、`node scripts/verify-admin-content.mjs`、`node scripts/verify-admin-users.mjs` 通过；`./node_modules/.bin/vue-tsc --build` 与 `./node_modules/.bin/eslint [changed]`（无 `--fix`）通过。未进行真实后端/浏览器联调；Codeforces/POJ 外站代交仍未实现（本批仅为账号管理）。

## H. B2 批次（管理通知 / 本人消息 / 自助资料与密码 / 身份变更审核）

本批接通后端 B2 接口（见 `backend-api-b2.md`），不新增依赖、不改后端；用户身份一律取自服务端登录态，前端不传 ownerUid。

- 管理通知：`ContentManage/Notice.vue` + `useNotice.ts`。真实分页 `page/pageSize/keyword/status`；列表展示标题/目标类型/状态/创建时间/发布时间。新建与保存均为草稿；编辑前经受保护 `GET /api/admin/notices/{id}` 回填正文与已保存 `targetIds`。收件方式 `USERS` 用现有用户查询（`GET /api/user/users`）显式多选，`CLASSES` 用现有学院→年级→班级级联查询，已保存但未解析的 ID 以原值展示且可删除，最多 1000；不手造名单、不默认全校。发布前确认收件目标且不可撤回，发布成功才刷新为已发布；重复点击禁用。已发布详情只读、无编辑按钮；删除确认明确只删管理记录、不撤回已投递消息，删除期间 `deleting` 并发锁保护、按钮禁用且重复点击只发一次 `DELETE`。正文以纯文本展示，不使用 `v-html`。
- 本人消息：`UserMessage.vue` + `useUserMessages.ts`。分页、全部/未读过滤、未读数、单条已读/全部已读、删除确认；数据来自 `/api/user/messages` 系列。消息展示标题/正文/时间/`readAt`，正文纯文本。route uid 与本人 uid 比较，非本人页面不可访问且 `isActive=false` 时组合式不发任何请求；刷新/读/删后更新未读数，工具栏刷新同时重读列表与未读数，删除最后一页最后一条回退页码，失败可重试且未读数失败保持 `null` 不伪 0。账号/路由切换同步 `reset()` 作废在途列表/未读数/读删并清空详情、计数、错误与页码，卸载同样作废。首页 `UserSidePanel.vue` 与个人侧栏 `UserSideBar.vue` 仅对本人显示真实未读数，带请求序号作废旧响应，并订阅收件箱读/删成功事件刷新计数。
- 自助资料：`UserSetting.vue` + `useUserSettings.ts`。`GET /api/user/profile` 真实加载；普通表单只编辑 `username/avatar/qq/github/blog`，保存只提交这 5 个白名单字段（空串清空可选项），成功后重新读取 profile 并同步 `userStore`（顶部用户名）。`uid/email` 只读展示，实名/学院/年级/班级通过独立身份变更申请表修改。头像仅允许 http(s) 或站内 `/` 路径，空/空白头像视为合法清除（与 payload 归一一致，非空仍拒绝 `javascript:`/`data:`/协议相对）；客户端同时校验用户名/QQ/GitHub/博客长度与格式；保存失败保留表单。保存/密码/身份提交均按 generation 快照，账号切换后旧 mutation 不重载资料、不清空/不返回成功。
- 密码：独立旧/新/确认表单（`type=password`，新密码 6–32 位、不 trim、两次一致），只调用 `PUT /api/user/password`，不使用管理员改密接口。失败保留输入不打印秘密；成功清空字段、`userStore.logout()` 清理本地 token 并导航登录（服务端已失效全部旧会话）；旧密码错误不清会话。密码不写 localStorage。
- 身份变更审核：`Change.vue` + `useUserChange.ts`。真实 `page/pageSize/status/keyword` 分页；行 key 为申请 id（同一用户可有历史申请）；按「原值 → 目标值」展示实名/学院/年级/班级 4 项，不提供 UID 变更。仅 `PENDING` 可操作，通过/驳回均要求原因（≤1000），调用 `/{id}/approve`、`/{id}/reject`；审核期间锁定申请 id，冲突保留错误并刷新真实状态；已移除 disabled 占位批量按钮。
- 成就认证 multipart 上传与受控 `fileList` 行为保持不变（回归见 `verify-oj-rework.mjs`）。

自测：`node scripts/verify-remaining-b2.mjs`（52 项契约/行为/源码约束，覆盖页筛选/uid 隔离/旧响应作废/身份 id/失败保留/密码成功退出与失败不退出/白名单 payload/空头像清除/删除并发锁/未读事件）、独立探针 `node <frozen>/frontend_b2_edge.mjs`（空头像 `isValidAvatar('')`、reset 后旧未读数丢弃）、`node scripts/verify-admin-users.mjs`、`node scripts/verify-admin-content.mjs`、`node scripts/verify-oj-rework.mjs`、`node scripts/verify-oj-composables.mjs`、`node scripts/verify-remaining-b1.mjs`、`node scripts/verify-business.mjs`、`node scripts/verify-user-search.mjs`、`node scripts/verify-contest-achievement.mjs`、`node scripts/verify-final-status.mjs`、`node scripts/verify-auth.mjs`；`./node_modules/.bin/vue-tsc --build` 与 `./node_modules/.bin/eslint [changed]`（无 `--fix`，退出码 0）与 `git diff --check`。未进行真实后端/浏览器联调；Codeforces/POJ 外站代交、收藏、注册策略/邀请码/Excel 等其余批次仍未完成。
