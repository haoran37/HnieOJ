# HnieOJ Frontend

> ⚠️ **项目状态：开发暂停中 / WIP**
> HnieOJ 在线评测系统前端仓库。由于个人安排，项目长期内可能无法持续维护。

[API文档](https://s.apifox.cn/91edc2c6-6918-4179-9852-9ec3742377c8)、[后端仓库](https://github.com/haoran37/HnieOJ-backend)、[在线演示](https://haoran37.github.io/HnieOJ/)

## 项目状态

- 当前进度：OJ 端与管理端页面开发基本完成。
- 待完成项：后端接口对接、联调、性能与体验优化。
- 当前说明：部分模块仍使用 mock 数据和占位上传地址。
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
- 后端联调阶段将逐步把 composables 中的 mock 逻辑替换为真实 API。
- 提交 PR 前至少执行：`pnpm type-check` 与 `pnpm lint`。

## 里程碑计划

- [ ] 对接鉴权与后端业务接口
- [ ] 替换 mock 数据并完成全链路联调
- [ ] 完善错误处理与边界状态体验
- [ ] 优化首屏性能与构建体积
- [ ] 补充测试与部署文档

## 许可证

本项目使用 [MIT License](./LICENSE) 开源。
