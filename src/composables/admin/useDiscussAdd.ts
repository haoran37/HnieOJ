/**
 * 管理端创建讨论。
 *
 * 管理员同时也是普通用户，创建讨论共用已存在的 `POST /api/discussions`。
 * 这里复用 oj 侧已真实接线的实现，避免维护两份完全相同的逻辑；
 * 管理员在 oj 侧可通过 `userStore.isAdmin` 选择“站内事务 / 题目讨论”。
 */
export { useDiscussAdd } from '@/composables/oj/useDiscussAdd';
