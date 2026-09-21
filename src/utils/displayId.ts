/**
 * 题目展示编号：把 0 基列表下标转成 A / B / … / Z / AA / AB 形式。
 *
 * 比赛题目、比赛题单与作业题目三处的展示编号都由本函数产生，改这里即三处同步。
 * `index` 为负时返回空串（调用点都是列表下标，负数属于越界输入）。
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
