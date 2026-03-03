# 贡献指南

感谢你对 HnieOJ Frontend 的关注与贡献。

## 开始之前

1. 请先阅读 `README.md`，了解项目状态与目录结构。
2. 本项目当前仍处于开发中（WIP），欢迎提交 bug 修复与小步改进。
3. 如涉及较大改动，建议先提 Issue 讨论方案。

## 本地开发

```bash
pnpm install
pnpm dev
```

## 提交前检查

请至少执行以下命令并确保通过：

```bash
pnpm type-check
pnpm lint
```

## 代码规范

- 使用 Vue 3 SFC 与 `<script setup lang="ts">`。
- 统一 2 空格缩进，遵循 `.editorconfig`。
- 组件文件使用 PascalCase（如 `TopNavi.vue`）。
- composables 使用 `useXxx.ts` 命名（如 `useContestDetail.ts`）。
- 使用 `@/` 作为 `src` 下模块导入别名。
- 请勿手动编辑自动生成文件：`auto-imports.d.ts`、`components.d.ts`。

## Commit 规范

- 建议使用 Conventional Commits：
  - `feat:` 新功能
  - `fix:` 修复
  - `refactor:` 重构
  - `chore:` 工程维护
- 单次提交尽量聚焦一个主题，便于审阅与回滚。

## Pull Request 要求

提交 PR 时请包含：

1. 变更说明（做了什么、为什么做）。
2. 关联 Issue（如有）。
3. UI 改动截图或录屏（如有界面变化）。
4. 已执行的本地检查结果（`type-check` / `lint`）。

## 行为准则

- 尊重每位贡献者，保持友好、建设性的沟通。
- 对评审意见有疑问时，请在 PR 中直接讨论并给出依据。
