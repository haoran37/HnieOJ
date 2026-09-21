/**
 * 题目展示编号：把 0 基列表下标转成 A / B / … / Z / AA / AB 形式。
 *
 * <h3>为什么收敛到一处（FE-03）</h3>
 * 原先有三个各自独立的实现：
 * - `composables/admin/useContestManage.ts`（导出）
 * - `composables/admin/useHomeworkManage.ts`（模块内私有）
 * - `composables/oj/useContestProblems.ts` 的 `getProblemIndex`（**写法不同**）
 *
 * 第三处用的是 `n % 26` + `Math.floor(n / 26) - 1`，另两处用 `(value - 1) % 26` +
 * `Math.floor((value - 1) / 26)`，进制基准是否一致必须先验证再合并。已用探针在
 * `-3 … 2000`、`1e6`、`123456789` 上逐位比对：**index >= 0 时三者输出完全一致**
 * （A..Z、AA、AB、AZ、BA、ZZ、AAA …），因此合并为下面这一份实现。
 *
 * <h3>index 为负时的行为</h3>
 * 调用点都是列表下标，不可能是负数。越界传负值时原先两种写法结果不同：
 * `getProblemIndex` 会返回 `'@'` / `'?'` / `'>'`（`65 + 负余数` 的产物），
 * 另两处返回 `''`。统一后取多数写法返回 `''`；该行为由
 * `review-verification/acceptance-20260921/scripts/w3-display-id-probe.mjs` 锁定。
 *
 * @param index 0 基列表下标
 * @returns 展示编号；index < 0 时返回空串
 */
export function buildDisplayIdByIndex(index: number): string {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}
