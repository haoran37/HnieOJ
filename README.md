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

- Node.js `^20.19.0 || >=22.12.0`
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

## 判题节点凭证

判题节点运行期只使用逐节点 Bearer 凭证，不连接 Nacos/Redis：

1. 管理员在后台「系统管理 → 服务管理」签发正式凭证（`POST /api/admin/judge/nodes/formal-tokens`，参数 `nodeName`、`maxConcurrency`、`supportedJudgeModes`）。
2. 凭证仅在签发成功时一次性展示供复制，请按节点部署脚本要求保存到节点凭证文件，不要写入前端或提交到仓库。
3. 临时节点由管理员签发授权码，节点首次启动用授权码兑换临时凭证，之后自动续期。

节点部署与凭证保存路径、续期细节见 go-judge 仓库 README 的「节点凭证」与 `deploy/deploy-judge-node.sh`。

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
- [x] 替换 mock 数据并完成全链路联调
- [ ] 完善错误处理与边界状态体验
- [ ] 优化首屏性能与构建体积
- [ ] 补充测试与部署文档

> 已完成接入的能力均调用真实后端；后端未提供的统计、排行榜、比赛大屏等能力不会伪造数据或假成功，统一在页面以「暂未开放」标注，详见 [docs/api-integration.md](./docs/api-integration.md) 的缺失能力清单。

## 许可证

本项目使用 [MIT License](./LICENSE) 开源。
