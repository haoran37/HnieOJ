# HnieOJ Frontend

> ⚠️ **项目状态：开发暂停中 / WIP**
> HnieOJ 在线评测系统前端仓库。由于个人安排，项目长期内可能无法持续维护。

[API文档](https://s.apifox.cn/91edc2c6-6918-4179-9852-9ec3742377c8)、[后端仓库](https://github.com/haoran37/HnieOJ-backend)、[在线演示](https://haoran37.github.io/HnieOJ/)

## 项目状态

- 当前进度：OJ 端与管理端页面开发基本完成。
- 接口对接：用户/内容/题目/判题/比赛/题单/作业等业务已接入真实后端接口。
- 待完成项：后端未提供的能力（如历史趋势统计、排行榜、比赛大屏等）已在页面明确标注「暂未开放」，待后端补齐。
- 维护节奏：长期内开发会放缓，本 README 用于说明现阶段状态。

## 功能概览

### OJ 端

- 首页、题库、题目详情与提交流程
- 题单、比赛、作业
- 提交状态列表与详情
- 排行榜、新闻、讨论区
- 用户中心、Wiki、探索页

### 管理端

- 仪表盘
- 内容管理（公告 / 新闻 / 通知）
- 用户管理（列表 / 注册申请 / 资料变更 / 权限）
- 题目、题单、比赛、作业管理
- 讨论与系统管理

## 技术栈

- Vue 3 + TypeScript + Vite
- Vue Router + Pinia
- Naive UI
- Vue I18n（`zh` / `en`）
- CodeMirror 6、ECharts、v-md-editor

## 环境要求

- Node.js `^22.18.0 || >=24.0.0`（依赖 `node:module` 的 `registerHooks` 与原生 TypeScript 类型剥离；23.x 不在支持范围）
- pnpm（建议使用最新稳定版）

## 快速开始

```bash
pnpm install
pnpm dev
```

## 本地前后端联调

前端通过 Vite 代理访问后端；默认代理目标为 `http://localhost:8800`。如需指向其他后端，可在项目根目录创建 `.env.local` 覆盖（见 `.env.example`）：

```bash
# 留空表示同源（开发环境由 Vite 代理）
VITE_API_BASE_URL=
# Vite 开发服务器代理的后端地址
VITE_BACKEND_URL=http://localhost:8800
```

`pnpm dev` 后，`/api`、`/ws` 与题面图片 `/oj/images` 会代理到 `VITE_BACKEND_URL`。

所需服务：

- 后端网关及后端各业务服务（默认 `8800`）
- MySQL 8、Redis 7.4、Nacos（配置与注册中心）
- 判题节点 go-judge（可选，用于代码评测）

后端启动、数据库/Nacos 配置与 Docker Compose 部署以同级后端仓库为准，详见 [HnieOJ-backend](https://github.com/haoran37/HnieOJ-backend) 的 `README.md`、`deploy/nacos/README.md`、`deploy/docker/docker-compose.dev.yml` 与 `deploy/MIGRATION-redis-gateway.md`。

## 判题节点凭证与注册

判题节点运行期只使用本机 `config.yaml` 与持久化 `identity.json`，不直连 Nacos/Redis，也不把私钥交给服务端：

1. 管理员在后台「系统管理 → 服务管理」签发注册凭据：正式（formal）与临时（temp）节点统一调用 `POST /api/admin/judge/nodes/bootstrap-tokens`，字段为 `nodeType`、`nodeName`、`maxConcurrency`（1..1000）、`supportedJudgeModes`（仅 `default`/`spj`/`interactive`）、`weight`（1..100，可选），以及两个不同的截止时间：
   - **注册凭据有效期** `expiresAt`（epoch 毫秒）：这张一次性 Bootstrap 凭据本身的过期时间，最长 30 天，过期后不能再注册；
   - **节点授权截止** `authorizationUntil`（epoch 毫秒）：节点可被调度的硬截止；临时节点必填且必须晚于当前时间。
2. 明文 `bootstrapToken` 只在签发成功时于当前会话模态展示一次；关闭弹窗、离开本页或切换账号即清空，不写入浏览器存储、不打印，请通过受控渠道交给节点运维。
3. 节点在宿主机用 CSPRNG 生成 Ed25519 私钥并持久化 `identity.json`，凭 Bootstrap 申请注册挑战（`POST /judge/nodes/enrollment-challenges`）并完成注册（`POST /judge/nodes/enroll`）；注册成功后经 WSS（`/ws/judge/node`）认证并接收 `TASK_ASSIGN`，不再使用旧 bearer-only 令牌或共享正式密钥。已注册节点重启复用 `identity.json`，无需再次 Bootstrap；一次性 Bootstrap 以整目录只读挂载（目录 0700、`bootstrap.token` 0600），注册成功后由运维删除宿主机明文。
4. 节点本机 `config.yaml` 的 `hnieoj.audience` 必须与后端 `hnieoj.submission.judge.node-security.audience`（`HNIEOJ_JUDGE_NODE_AUDIENCE`）一致，`baseUrl`（HTTPS）与 `wssUrl`（WSS）也要与后端入口一起修改；留空或写错会导致 WSS 认证失败。判题节点只有本地 config + identity，私钥只保存在节点宿主机、沙箱不挂载私钥。

已退休的旧通路不再可用：节点侧 `POST /api/judge/temp-token` 与 `POST /api/admin/judge/nodes/formal-token/rotate` 仍保留在旧 controller 中但显式返回 403；`POST /api/admin/judge/nodes/formal-tokens`（逐节点正式凭证）与 `POST /api/admin/judge/nodes/tokens/{tokenId}/draining`（排空开关）已无对应路由。以上能力统一由 Bootstrap + Ed25519 注册 + WSS 取代。

节点排空/恢复/吊销由管理端调用 `POST /api/admin/judge/nodes/tokens/{tokenId}/drain`、`/enable` 与 `/revoke`；「服务管理 → 节点状态」以 `status === draining` 展示排空状态，并发展示 `maxConcurrency`、到期展示 `expireTime`，已吊销或硬到期节点不提供恢复入口。

节点部署与凭证保存路径、续期细节见 go-judge 仓库 README 的「节点凭证」与 `deploy/deploy-judge-node.sh`；受众、HTTPS/WSS、Redis Streams 与租约排障以后端仓库 `docs/judge-ops.md` 为准。

判题模式说明：后端默认只启用 `default`。需要 SPJ / 交互题时，需按现有配置将 `spj`/`interactive` 显式加入后端 `hnieoj.submission.supported-judge-modes`（环境变量 `HNIEOJ_SUBMISSION_SUPPORTED_JUDGE_MODES`），并与节点正式凭证的 `supportedJudgeModes` 及节点配置保持一致后才可评测；这不是前端开关。判题节点运行环境：go-judge 镜像基于 Debian（`Dockerfile.hnieoj` 的 `debian:bookworm-slim`）并内置 Java 17（`openjdk-17-jdk-headless`）、C/C++17、Python 3 等工具链；`mount.yaml` 定义的是 go-judge 判题沙箱的 bind mount 白名单（把宿主机路径映射给被测程序），属于沙箱挂载而非 Docker 卷，不会在节点上安装软件包。

## 常用命令

```bash
pnpm build       # 类型检查 + 生产构建
pnpm build-only  # 仅构建
pnpm type-check  # vue-tsc 类型检查
pnpm lint        # eslint 自动修复
pnpm lint:all    # lint + UTF-8 编码检查
pnpm preview     # 预览 dist 产物
```

## 目录结构

```text
src/
├─assets/         # 静态资源
├─components/     # 通用组件
├─composables/    # 组合式业务逻辑
│  ├─admin/       # 管理端
│  └─oj/          # OJ 端
├─i18n/           # 国际化
├─layouts/        # 页面布局（前台/后台骨架）
├─router/         # 路由定义与路由守卫
├─stores/         # Pinia 全局状态管理
├─styles/         # 全局样式
├─types/          # TypeScript 类型定义
├─utils/          # 通用工具函数
└─views/          # 
   ├─admin/       # 管理端页面
   ├─auth/        # 登录/注册等认证页面
   ├─error/       # 错误页（403/404 等）
   ├─oj/          # OJ 端页面
   └─special/     # 特殊场景页面（比赛模式/维护模式等）
```

## 开发说明

- 请勿手动修改自动生成文件：`auto-imports.d.ts`、`components.d.ts`。
- 业务数据统一通过 `src/utils/api.ts` 访问真实后端；后端未提供的能力不得伪造数据，需以「暂未开放」空状态展示。
- 提交 PR 前至少执行：`pnpm type-check` 与 `pnpm lint`。

## 里程碑计划

- [x] 对接鉴权与后端业务接口
- [x] 移除 mock 数据，接口按后端契约接入
- [ ] 完成真实后端 / 浏览器全链路联调（部分真实后端与浏览器流程已验证；提交→判题→回传全链路仍待联调）
- [ ] 完善错误处理与边界状态体验
- [ ] 优化首屏性能与构建体积
- [ ] 补充测试与部署文档

> 已完成接入的能力均调用真实后端；后端未提供的统计、排行榜、比赛大屏等能力不会伪造数据或假成功，统一在页面以「暂未开放」标注，详见 [docs/api-integration.md](./docs/api-integration.md) 的缺失能力清单。
> 接口契约已按后端实现接入并做类型检查/受控桩验证；部分真实后端与浏览器流程已验证，但**提交→判题→回传的完整链路尚未真实联调**。

## 许可证

本项目使用 [MIT License](./LICENSE) 开源。
