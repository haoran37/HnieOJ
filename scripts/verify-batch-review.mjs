// 成就认证 / 资料变更批量通过串联行为回归（F-BATCH）。
// 用真实组合式 + 受控 HTTP 桩 + deferred 复现：选择过滤、确认快照、过时确认拒绝、
// 部分/全失败、网络失败重试、批量与单条共享写锁、翻页清选择、迟到响应、
// 末页刷新回退与两个 view 的真实接线。
// 运行：node scripts/verify-batch-review.mjs（在仓库根目录）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

const root = process.cwd();
const dataUrl = (code) => 'data:text/javascript,' + encodeURIComponent(code);
const vueUrl = import.meta.resolve('vue');

// --------------------------------------------------
// 全局桩（naive-ui / store）
// --------------------------------------------------
const messages = [];
globalThis.__msg = {
  success: (value) => messages.push({ type: 'success', value }),
  error: (value) => messages.push({ type: 'error', value }),
  warning: (value) => messages.push({ type: 'warning', value }),
  info: (value) => messages.push({ type: 'info', value }),
};

const dialogs = [];
// 记录并返回同一个对象：naive-ui 的 dialog.* 返回 reactive options 实例，
// 组合式会在写操作在途时禁用它（closeOnEsc/maskClosable），测试必须观察到同一实例
const recordDialog = (type) => (options) => {
  const entry = { type, ...options };
  // 模拟真实 DialogEnvironment：destroy() 关闭弹窗并走完离场生命周期
  entry.destroy = () => {
    entry.__destroyed = true;
    entry.onAfterLeave?.();
  };
  dialogs.push(entry);
  globalThis.__lastDialog = entry;
  return entry;
};
globalThis.__dialog = {
  success: recordDialog('success'),
  warning: recordDialog('warning'),
  error: recordDialog('error'),
  info: recordDialog('info'),
};

const naiveStub = dataUrl(
  'export const useMessage=()=>globalThis.__msg; export const useDialog=()=>globalThis.__dialog;',
);

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'vue') return { shortCircuit: true, url: vueUrl };
    if (specifier === 'naive-ui') return { shortCircuit: true, url: naiveStub };
    if (specifier === 'vue-router') {
      return {
        shortCircuit: true,
        url: dataUrl(
          'export const useRoute=()=>globalThis.__route;' +
            'export const useRouter=()=>({push:async()=>{},replace:async()=>{},back:()=>{}});',
        ),
      };
    }
    if (specifier.startsWith('@/')) {
      let target = path.join(root, 'src', specifier.slice(2));
      if (!path.extname(target)) target += '.ts';
      return next(pathToFileURL(target).href, context);
    }
    return next(specifier, context);
  },
});

const storage = new Map([['token', 'real-token']]);
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

// --------------------------------------------------
// 受控 HTTP
// --------------------------------------------------
const json = (data, status = 200) =>
  new Response(
    JSON.stringify({ code: status === 200 ? 200 : status, msg: status === 200 ? 'success' : 'error', data }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
const jsonMsg = (msg, code = 400) =>
  new Response(JSON.stringify({ code, msg, data: null }), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  });

let responder = async () => json(null);
let calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  return responder(String(url), init);
};

const posts = () => calls.filter((call) => call.init?.method === 'POST');
const bodyOf = (call) => JSON.parse(String(call.init?.body));
const queryOf = (call) => Object.fromEntries(new URL(call.url, 'http://localhost').searchParams.entries());
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const flush = async () => {
  await tick();
  await tick();
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// --------------------------------------------------
// 真实模块
// --------------------------------------------------
const api = await import(pathToFileURL(path.join(root, 'src/utils/api.ts')).href);
const ach = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useAchievementManage.ts')).href
);
const change = await import(pathToFileURL(path.join(root, 'src/composables/admin/useUserChange.ts')).href);

const readSrc = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
const achievementView = readSrc('src/views/admin/UserManage/Achievement.vue');
const changeView = readSrc('src/views/admin/UserManage/Change.vue');
const achievementComposable = readSrc('src/composables/admin/useAchievementManage.ts');
const changeComposable = readSrc('src/composables/admin/useUserChange.ts');

// --------------------------------------------------
// 样本数据
// --------------------------------------------------
const achRow = (id, status = 'pending') => ({
  id,
  uid: `u${id}`,
  username: `n${id}`,
  title: `t${id}`,
  status,
  description: '',
  fileUrl: '',
  submitTime: 1767225600000,
});

const changeSnapshot = (overrides = {}) => ({
  realname: '张三',
  collegeId: null,
  grade: '2022',
  classId: null,
  username: 'zhangsan',
  email: null,
  phone: null,
  avatar: null,
  qq: null,
  cfUsername: null,
  github: null,
  blog: null,
  ...overrides,
});

const changeRow = (id, status = 'PENDING') => ({
  id,
  uid: `u${id}`,
  original: changeSnapshot(),
  proposed: changeSnapshot({ email: `u${id}@example.com` }),
  reason: '换邮箱',
  status,
  reviewerUid: null,
  reviewReason: null,
  reviewAt: null,
  gmtCreate: '2026-09-01 10:00:00',
  gmtModified: null,
});

const listResponder = (rows, postData) => (url, init) => {
  if (init?.method === 'POST') return json(postData);
  if (url.includes('/colleges') || url.includes('/classes')) return json([]);
  return json({ list: rows, total: rows.length });
};

let failures = 0;
let passed = 0;
async function test(name, fn) {
  messages.length = 0;
  dialogs.length = 0;
  calls = [];
  globalThis.__lastDialog = null;
  try {
    await fn();
    passed += 1;
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + ': ' + (error && error.message));
  }
}

const hasMessage = (type, includes) =>
  messages.some((message) => message.type === type && String(message.value).includes(includes));

// ==================================================
// A. 真实 API 契约
// ==================================================
await test('成就批量 API：POST /api/admin/achievements/batch/approve 只发送 {ids} 且携带真实 token', async () => {
  responder = async () => json({ successCount: 1, failedCount: 1, failures: [{ id: 3, reason: '已通过' }] });
  const result = await api.batchApproveAchievements([1, 3]);
  assert.equal(calls.length, 1, '批量通过只允许一次请求');
  const call = calls[0];
  assert.equal(call.url, '/api/admin/achievements/batch/approve');
  assert.equal(call.init.method, 'POST');
  assert.deepEqual(bodyOf(call), { ids: [1, 3] });
  assert.equal(call.init.headers.get('Authorization'), 'Bearer real-token');
  assert.equal(call.init.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(result, { successCount: 1, failedCount: 1, failures: [{ id: 3, reason: '已通过' }] });
});

// ==================================================
// B. 成就组合式
// ==================================================
await test('成就选择列：字符串 key 只保留当前页 pending，正确映射数字 ids 并过滤非法/重复/已审核', async () => {
  responder = listResponder([achRow(1), achRow(2, 'approved'), achRow(3), achRow(4, 'rejected')]);
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1', '3', '3', '2', '4', '999', 'abc', '-1', 1]);
  assert.deepEqual(state.selectedRowKeys.value, ['1', '3'], '只保留当前页 pending 的字符串 key 且去重');
  assert.deepEqual(state.selectedIds.value, [1, 3], '字符串 key 必须映射为数字 API ids');
  assert.ok(state.selectedIds.value.every((id) => Number.isInteger(id)));
});

await test('成就批量：无选择不弹确认、不发请求，仅提示先选择', async () => {
  responder = listResponder([achRow(1)]);
  const state = ach.useAchievementManage();
  await state.fetchList();
  calls = [];
  assert.equal(state.openBatchApprove(), false);
  assert.equal(dialogs.length, 0, '无选择不得打开确认框');
  assert.equal(posts().length, 0, '无选择不得发请求');
  assert.ok(hasMessage('warning', '请先选择'), '必须提示先选择');
});

await test('成就批量：确认显示数量、按已校验快照只发一次 {ids}，成功后刷新并清空选择', async () => {
  responder = (url, init) => {
    if (init?.method === 'POST') return json({ successCount: 2, failedCount: 0, failures: [] });
    return json({ list: [achRow(1), achRow(3)], total: 2 });
  };
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1', '3']);
  assert.equal(state.openBatchApprove(), true);
  assert.equal(dialogs.length, 1);
  const confirm = dialogs[0];
  assert.ok(String(confirm.content).includes('2 条'), '确认必须明确数量');
  // 弹窗后勾选变化不得替换已确认对象
  state.handleCheckedRowKeysChange(['1']);
  assert.deepEqual(state.selectedIds.value, [1]);
  const pending = confirm.onPositiveClick();
  assert.equal(state.mutating.value, true, '批量在途必须持有写锁');
  assert.equal(await pending, true);
  assert.equal(posts().length, 1, '只允许一次批量 POST');
  assert.equal(posts()[0].url, '/api/admin/achievements/batch/approve');
  assert.deepEqual(bodyOf(posts()[0]), { ids: [1, 3] }, '必须提交弹窗打开时的已校验快照');
  assert.deepEqual(state.batchResult.value, { successCount: 2, failedCount: 0, failures: [] });
  assert.equal(state.mutating.value, false);
  assert.deepEqual(state.selectedRowKeys.value, []);
  assert.ok(hasMessage('success', '成功 2 条'), '全部成功才提示成功');
  assert.ok(
    calls.some((call) => call.init?.method !== 'POST' && call.url.startsWith('/api/admin/achievements?')),
    '批量后必须重新读取真实列表',
  );
});

await test('成就批量：HTTP200 部分失败按真实计数展示，不提示全部成功', async () => {
  responder = listResponder(
    [achRow(1), achRow(3)],
    { successCount: 1, failedCount: 1, failures: [{ id: 3, reason: '状态已变更' }] },
  );
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1', '3']);
  state.openBatchApprove();
  await dialogs[0].onPositiveClick();
  assert.deepEqual(state.batchResult.value, {
    successCount: 1,
    failedCount: 1,
    failures: [{ id: 3, reason: '状态已变更' }],
  });
  assert.equal(state.batchError.value, null);
  assert.ok(!messages.some((message) => message.type === 'success'), '部分失败不得提示全部成功');
  assert.ok(hasMessage('warning', '成功 1 条'), '必须显示真实成功数');
  assert.ok(hasMessage('warning', '失败 1 条'), '必须显示真实失败数');
  assert.equal(state.mutating.value, false);
});

await test('成就批量：HTTP 失败显示真实错误、释放锁并刷新，重试重新读取与重新选择', async () => {
  let failFirst = true;
  responder = (url, init) => {
    if (init?.method === 'POST') {
      if (failFirst) {
        failFirst = false;
        return jsonMsg('批量服务暂不可用', 500);
      }
      return json({ successCount: 1, failedCount: 0, failures: [] });
    }
    return json({ list: [achRow(1), achRow(3)], total: 2 });
  };
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1', '3']);
  state.openBatchApprove();
  await dialogs[0].onPositiveClick();
  assert.equal(state.batchError.value, '批量服务暂不可用', '必须显示后端真实错误');
  assert.equal(state.batchResult.value, null, 'HTTP 失败不得伪装成失败汇总');
  assert.equal(state.mutating.value, false, '失败必须释放写锁');
  assert.ok(hasMessage('error', '批量服务暂不可用'));
  assert.ok(!messages.some((message) => message.type === 'success'), 'HTTP 失败不得提示成功');
  assert.deepEqual(state.selectedRowKeys.value, [], '失败后旧选择清空');
  // 重试：重新选择仍 pending 的行，只重放本次选择
  state.handleCheckedRowKeysChange(['3']);
  state.openBatchApprove();
  await dialogs[1].onPositiveClick();
  assert.equal(state.batchError.value, null, '下一次提交前清除旧错误');
  assert.deepEqual(state.batchResult.value, { successCount: 1, failedCount: 0, failures: [] });
  const batchPosts = posts();
  assert.equal(batchPosts.length, 2);
  assert.deepEqual(bodyOf(batchPosts[0]), { ids: [1, 3] });
  assert.deepEqual(bodyOf(batchPosts[1]), { ids: [3] }, '不得自动重放已成功的 id');
});

await test('成就批量：弹窗期间刷新/翻页使确认过时，拒绝旧页快照并要求重选（可立即重试）', async () => {
  responder = listResponder([achRow(1)], { successCount: 1, failedCount: 0, failures: [] });
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  assert.equal(state.openBatchApprove(), true);
  const confirm = dialogs[0];
  assert.equal(state.openBatchApprove(), false, '不得同时打开多个确认框');
  assert.equal(dialogs.length, 1);
  await state.fetchList();
  assert.equal(await confirm.onPositiveClick(), false, '过时确认必须被拒绝');
  assert.equal(posts().length, 0, '过时确认不得偷偷操作旧页');
  assert.ok(hasMessage('warning', '重新选择'), '必须提示重新选择');
  assert.equal(state.mutating.value, false);
  assert.equal(confirm.__destroyed, true, '过时确认必须关闭弹窗');
  assert.equal(state.reviewConfirm.value, null, '过时确认必须释放确认位');
  // 重新选择仍 pending 的行后可以立即重试，且只提交新选择
  state.handleCheckedRowKeysChange(['1']);
  assert.equal(state.openBatchApprove(), true, '过时确认释放后必须能重新打开确认框');
  await dialogs.at(-1).onPositiveClick();
  assert.equal(posts().length, 1);
  assert.deepEqual(bodyOf(posts()[0]), { ids: [1] }, '重试只提交重新选择且仍 pending 的 id');
});

await test('成就列表：刷新立即清空选择，加载期间不可选/不可提交', async () => {
  const gate = deferred();
  let callCount = 0;
  responder = () => {
    callCount += 1;
    if (callCount === 2) return gate.promise;
    return json({ list: [achRow(1)], total: 1 });
  };
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  assert.deepEqual(state.selectedIds.value, [1]);
  const pending = state.fetchList();
  assert.equal(state.loading.value, true);
  assert.deepEqual(state.selectedRowKeys.value, [], '刷新开始必须清空旧选择');
  state.handleCheckedRowKeysChange(['1']);
  assert.deepEqual(state.selectedRowKeys.value, [], '加载期间不得选中');
  assert.equal(state.openBatchApprove(), false, '加载期间不得提交批量');
  assert.equal(state.handleApprove(achRow(1)), false, '加载期间不得打开通过确认');
  assert.equal(state.openRejectModal(achRow(1)), false, '加载期间不得打开驳回弹窗');
  gate.resolve(json({ list: [achRow(1)], total: 1 }));
  await pending;
  assert.equal(state.loading.value, false);
});

await test('成就列表：迟到响应不得覆盖新页结果，也不复活旧页选择', async () => {
  const staleGate = deferred();
  let first = true;
  responder = () => {
    if (first) {
      first = false;
      return staleGate.promise;
    }
    return json({ list: [achRow(8)], total: 1 });
  };
  const state = ach.useAchievementManage();
  const stale = state.fetchList();
  const fresh = state.fetchList();
  await fresh;
  staleGate.resolve(json({ list: [achRow(7)], total: 1 }));
  await stale;
  assert.equal(state.list.value[0].id, 8, '迟到响应不得覆盖新结果');
  assert.deepEqual(state.selectedRowKeys.value, []);
});

await test('成就：批量确认与单条确认不得叠加，单条在途时批量被写锁拒绝', async () => {
  const approveGate = deferred();
  let approveStarted = false;
  responder = (url, init) => {
    if (init?.method === 'POST') {
      approveStarted = true;
      return approveGate.promise;
    }
    return json({ list: [achRow(1)], total: 1 });
  };
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  assert.equal(state.openBatchApprove(), true);
  const batchConfirm = dialogs[0];
  // 批量确认打开期间不得再打开单条通过/打回确认，避免确认叠加导致先后重复提交
  assert.equal(state.handleApprove(state.list.value[0]), false, '批量确认打开期间不得再开单条确认');
  assert.equal(state.openRejectModal(state.list.value[0]), false, '批量确认打开期间不得开打回弹窗');
  assert.equal(dialogs.length, 1, '不得叠加确认框');
  // 取消批量确认（真实生命周期：先回调、后 afterLeave）后可正常开单条确认
  assert.equal(batchConfirm.onNegativeClick(), true, '非在途取消必须允许关闭');
  batchConfirm.onAfterLeave();
  assert.equal(state.reviewConfirm.value, null);
  assert.equal(state.handleApprove(state.list.value[0]), true);
  const singleConfirm = dialogs[1];
  const single = singleConfirm.onPositiveClick();
  await tick();
  assert.equal(approveStarted, true);
  assert.equal(state.mutating.value, true);
  assert.equal(await batchConfirm.onPositiveClick(), false, '已取消的批量确认不得重放请求');
  assert.equal(await singleConfirm.onPositiveClick(), false, '已消费的单条确认不得重复提交');
  assert.equal(posts().length, 1, '互斥期间不得新增 POST');
  assert.equal(state.handleApprove(state.list.value[0]), false, '在途不得再打开通过确认');
  assert.equal(state.openRejectModal(state.list.value[0]), false, '在途不得换驳回对象');
  assert.equal(state.openBatchApprove(), false, '在途不得打开批量确认');
  assert.equal(state.showRejectModal.value, false);
  approveGate.resolve(json(null));
  await single;
  assert.equal(state.mutating.value, false);
  assert.equal(state.reviewConfirm.value, null);
  assert.equal(posts().length, 1, '完成后仍只有一次单条 POST');
});

await test('成就：批量在途时单条通过/驳回与重复批量均被写锁拒绝', async () => {
  const batchGate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST') return batchGate.promise;
    return json({ list: [achRow(1)], total: 1 });
  };
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  state.openBatchApprove();
  const batch = dialogs[0].onPositiveClick();
  await tick();
  assert.equal(state.mutating.value, true);
  assert.equal(state.handleApprove(state.list.value[0]), false, '批量在途不得打开单条通过确认');
  assert.equal(state.openRejectModal(state.list.value[0]), false, '批量在途不得打开驳回弹窗');
  assert.equal(await state.handleRejectSubmit(), false, '批量在途不得提交驳回');
  assert.equal(state.openBatchApprove(), false, '批量在途不得重复打开确认框');
  assert.equal(posts().length, 1, '互斥期间不得新增 POST');
  batchGate.resolve(json({ successCount: 1, failedCount: 0, failures: [] }));
  await batch;
  assert.equal(state.mutating.value, false);
});

await test('成就驳回：快照 id/reason，在途关闭受控，不占用附件下载锁', async () => {
  const downloadGate = deferred();
  const rejectGate = deferred();
  let rejectCall = null;
  responder = (url, init) => {
    if (url.endsWith('/file')) return downloadGate.promise;
    if (init?.method === 'POST' && url.endsWith('/reject')) {
      rejectCall = { url, body: bodyOf({ url, init }) };
      return rejectGate.promise;
    }
    return json({ list: [achRow(1)], total: 1 });
  };
  const state = ach.useAchievementManage();
  await state.fetchList();
  const row = { ...state.list.value[0], fileUrl: '/api/admin/achievements/1/file' };
  // 下载在途占下载锁，不占审批写锁
  const download = state.handleDownloadFile(row);
  await tick();
  assert.equal(state.submitting.value, true, '下载必须持有独立下载状态');
  assert.equal(state.mutating.value, false);

  assert.equal(state.openRejectModal(row), true);
  state.rejectReason.value = '材料不足';
  const submitting = state.handleRejectSubmit();
  await tick();
  assert.equal(state.mutating.value, true, '驳回必须持有写锁');
  assert.equal(await state.handleRejectSubmit(), false, '在途双击驳回不得重复提交');
  state.selectedRowKeys.value = ['1'];
  assert.equal(state.openBatchApprove(), false, '驳回在途不得打开批量确认');
  // 在途篡改弹窗内容/目标 id 不改变已发请求
  state.rejectReason.value = '已篡改';
  state.currentRejectId.value = 999;
  state.handleRejectShowChange(false);
  assert.equal(state.showRejectModal.value, true, '在途不得关闭驳回弹窗');
  assert.equal(state.closeRejectModal(), false);
  rejectGate.resolve(json(null));
  assert.equal(await submitting, true);
  assert.equal(rejectCall.url, '/api/admin/achievements/1/reject');
  assert.deepEqual(rejectCall.body, { reason: '材料不足' }, '必须提交提交时的 id/reason 快照');
  assert.equal(state.mutating.value, false);
  assert.equal(state.showRejectModal.value, false);

  downloadGate.resolve(jsonMsg('附件不存在', 404));
  await download;
  assert.equal(state.submitting.value, false);
  assert.ok(hasMessage('error', '附件不存在'), '下载失败必须显示真实错误');
});

await test('成就列表：成功后空末页回退到合法页', async () => {
  const pages = [];
  responder = (url) => {
    const page = queryOf({ url, init: undefined }).page;
    pages.push(page);
    if (page === '2') return json({ list: [], total: 1 });
    return json({ list: [achRow(1)], total: 1 });
  };
  const state = ach.useAchievementManage();
  state.pagination.page = 2;
  await state.fetchList();
  await flush();
  assert.deepEqual(pages, ['2', '1'], '空末页必须回退上一页重读');
  assert.equal(state.pagination.page, 1);
  assert.equal(state.list.value.length, 1);
});

// ==================================================
// C. 资料变更组合式
// ==================================================
await test('资料变更选择列：数字 key 只保留当前页 PENDING，非法/重复/已审核过滤', async () => {
  responder = listResponder([changeRow(11), changeRow(12, 'APPROVED'), changeRow(13)]);
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11, 13, 13, '12', 12, 'x', -3, 999]);
  assert.deepEqual(state.selectedIds.value, [11, 13], '只保留当前页 PENDING 的数字 id 且去重');
  assert.ok(state.selectedIds.value.every((id) => typeof id === 'number'));
});

await test('资料变更批量：无选择不请求，确认显示数量，只发一次 {ids} 且成功后刷新', async () => {
  responder = listResponder(
    [changeRow(11), changeRow(13)],
    { successCount: 2, failedCount: 0, failures: [] },
  );
  const state = change.useUserChange();
  await state.fetchChanges();
  assert.equal(state.openBatchApprove(), false);
  assert.equal(dialogs.length, 0);
  assert.equal(posts().length, 0);
  assert.ok(hasMessage('warning', '请先选择'));
  state.handleCheckedRowKeysChange([11, 13]);
  assert.equal(state.openBatchApprove(), true);
  assert.equal(state.openBatchApprove(), false, '不得重复打开确认框');
  assert.equal(dialogs.length, 1);
  const confirm = dialogs[0];
  assert.ok(String(confirm.content).includes('2 条'), '确认必须明确数量');
  await confirm.onPositiveClick();
  assert.equal(posts().length, 1);
  assert.equal(posts()[0].url, '/api/admin/profile-change-requests/batch-approve');
  assert.deepEqual(bodyOf(posts()[0]), { ids: [11, 13] }, '批量接口不接收 reason，只发送 ids');
  assert.deepEqual(state.batchResult.value, { successCount: 2, failedCount: 0, failures: [] });
  assert.deepEqual(state.selectedIds.value, []);
  assert.equal(state.saving.value, false);
  assert.ok(hasMessage('success', '成功 2 条'));
});

await test('资料变更批量：HTTP200 全失败保留字符串申请 ID 与原因，不冒充成功', async () => {
  responder = listResponder(
    [changeRow(11), changeRow(13)],
    {
      successCount: 0,
      failedCount: 2,
      failures: [
        { id: '11', reason: '原值已变更' },
        { id: '13', reason: '状态冲突' },
      ],
    },
  );
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11, 13]);
  state.openBatchApprove();
  await dialogs[0].onPositiveClick();
  assert.deepEqual(state.batchResult.value, {
    successCount: 0,
    failedCount: 2,
    failures: [
      { id: '11', reason: '原值已变更' },
      { id: '13', reason: '状态冲突' },
    ],
  });
  assert.ok(!messages.some((message) => message.type === 'success'), '全失败不得提示成功');
  assert.ok(hasMessage('warning', '失败 2 条'));
  assert.equal(state.batchError.value, null);
  assert.equal(state.saving.value, false);
});

await test('资料变更批量：HTTP 失败显示真实错误、释放锁、刷新并允许重试', async () => {
  let failFirst = true;
  responder = (url, init) => {
    if (init?.method === 'POST') {
      if (failFirst) {
        failFirst = false;
        return jsonMsg('网关超时', 504);
      }
      return json({ successCount: 1, failedCount: 0, failures: [] });
    }
    return json({ list: [changeRow(11)], total: 1 });
  };
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11]);
  state.openBatchApprove();
  await dialogs[0].onPositiveClick();
  assert.equal(state.batchError.value, '网关超时');
  assert.equal(state.batchResult.value, null, 'HTTP 失败不得写成失败汇总');
  assert.equal(state.saving.value, false);
  assert.ok(hasMessage('error', '网关超时'));
  assert.ok(
    calls.some((call) => call.init?.method !== 'POST' && call.url.startsWith('/api/admin/profile-change-requests?')),
    '失败也要刷新真实列表',
  );
  state.handleCheckedRowKeysChange([11]);
  state.openBatchApprove();
  await dialogs[1].onPositiveClick();
  assert.equal(state.batchError.value, null, '下一次提交前清除旧错误');
  assert.deepEqual(state.batchResult.value, { successCount: 1, failedCount: 0, failures: [] });
  assert.deepEqual(bodyOf(posts()[1]), { ids: [11] }, '重试只提交重新选择的 id');
});

await test('资料变更：单条审核在途时批量与重复提交均被写锁拒绝', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST') return gate.promise;
    return json({ list: [changeRow(11)], total: 1 });
  };
  const state = change.useUserChange();
  await state.fetchChanges();
  assert.equal(state.openApprove(changeRow(11)), true);
  state.reviewForm.reason = '同意';
  const single = state.submitReview();
  await tick();
  assert.equal(state.saving.value, true);
  state.handleCheckedRowKeysChange([11]);
  assert.deepEqual(state.selectedIds.value, [], '在途不得改变选择');
  state.selectedIds.value = [11];
  assert.equal(state.openBatchApprove(), false, '单条在途不得打开批量确认');
  assert.equal(posts().length, 1, '互斥期间不得新增 POST');
  assert.equal(state.openReject({ ...changeRow(11), id: 99 }), false, '在途不得换审核对象');
  assert.equal(await state.submitReview(), false, '在途重复提交必须被拒绝');
  gate.resolve(json(null));
  await single;
  assert.equal(state.saving.value, false);
});

await test('资料变更：批量在途时单条审核与重复批量均被写锁拒绝', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST') return gate.promise;
    return json({ list: [changeRow(11)], total: 1 });
  };
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11]);
  state.openBatchApprove();
  const batch = dialogs[0].onPositiveClick();
  await tick();
  assert.equal(state.saving.value, true);
  assert.equal(state.openApprove(changeRow(11)), false);
  assert.equal(state.openBatchApprove(), false);
  assert.equal(await state.submitReview(), false);
  assert.equal(posts().length, 1);
  gate.resolve(json({ successCount: 1, failedCount: 0, failures: [] }));
  await batch;
  assert.equal(state.saving.value, false);
});

await test('资料变更：翻页立即清空选择，加载期间不可选/不可提交', async () => {
  const gate = deferred();
  responder = (url) => {
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    if (url.includes('page=2')) return gate.promise;
    return json({ list: [changeRow(11)], total: 5 });
  };
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11]);
  state.handlePageChange(2);
  assert.equal(state.currentPage.value, 2);
  assert.equal(state.listLoading.value, true);
  assert.deepEqual(state.selectedIds.value, [], '翻页开始必须清空旧选择');
  state.handleCheckedRowKeysChange([11]);
  assert.deepEqual(state.selectedIds.value, [], '加载期间不得选中');
  assert.equal(state.openBatchApprove(), false, '加载期间不得提交批量');
  assert.equal(state.openApprove(changeRow(11)), false, '加载期间不得打开审核弹窗');
  gate.resolve(json({ list: [changeRow(21)], total: 5 }));
  await tick();
  assert.equal(state.listLoading.value, false);
  assert.equal(state.changes.value[0].id, 21);
});

await test('资料变更：迟到响应不覆盖新页结果', async () => {
  const staleGate = deferred();
  let first = true;
  responder = (url) => {
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    if (first) {
      first = false;
      return staleGate.promise;
    }
    return json({ list: [changeRow(21)], total: 1 });
  };
  const state = change.useUserChange();
  const stale = state.fetchChanges();
  const fresh = state.fetchChanges();
  await fresh;
  staleGate.resolve(json({ list: [changeRow(11)], total: 1 }));
  await stale;
  assert.equal(state.changes.value[0].id, 21, '迟到响应不得覆盖新结果');
  assert.deepEqual(state.selectedIds.value, []);
});

await test('资料变更：成功后空末页回退到合法页（最小处理）', async () => {
  const pages = [];
  responder = (url) => {
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    const page = queryOf({ url, init: undefined }).page;
    pages.push(page);
    if (page === '3') return json({ list: [], total: 20 });
    return json({ list: [changeRow(11)], total: 20 });
  };
  const state = change.useUserChange();
  state.currentPage.value = 3;
  await state.fetchChanges();
  await flush();
  assert.deepEqual(pages, ['3', '2'], '空末页必须回退上一页重读');
  assert.equal(state.currentPage.value, 2);
  assert.equal(state.changes.value.length, 1);
});

await test('资料变更：刷新失败显示列表错误但不篡改已知批量结果', async () => {
  responder = listResponder(
    [changeRow(11)],
    { successCount: 1, failedCount: 1, failures: [{ id: '11', reason: '冲突' }] },
  );
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11]);
  state.openBatchApprove();
  await dialogs[0].onPositiveClick();
  const known = state.batchResult.value;
  assert.deepEqual(known, { successCount: 1, failedCount: 1, failures: [{ id: '11', reason: '冲突' }] });
  responder = () => jsonMsg('列表加载失败', 500);
  await state.fetchChanges();
  assert.deepEqual(state.batchResult.value, known, '刷新失败不得篡改已知批量结果');
  assert.equal(state.batchError.value, null);
  assert.equal(state.listError.value, '列表加载失败');
});

// ==================================================
// D. view 接线（只能由页面承担的约束）
// ==================================================
await test('成就页接线：选择列/字符串 key/批量入口/结果明细/驳回过时关闭/下载独立', () => {
  assert.ok(achievementView.includes("type: 'selection'"), '成就表必须有选择列');
  assert.ok(achievementView.includes('String(row.id)'), '成就行 key 必须是字符串 id');
  assert.ok(achievementView.includes(':checked-row-keys="selectedRowKeys"'), '选择必须受控');
  assert.ok(
    achievementView.includes('@update:checked-row-keys="handleCheckedRowKeysChange"'),
    '选择变化必须经过校验',
  );
  assert.ok(achievementView.includes('@click="openBatchApprove"'), '必须有真实批量通过入口');
  assert.ok(achievementView.includes('batchResult.failures'), '必须渲染失败明细');
  assert.ok(achievementView.includes('failure.reason'), '必须渲染每条失败原因');
  assert.ok(achievementView.includes("batchResult.failedCount > 0 ? 'warning' : 'success'"), '失败不得显示成功样式');
  assert.ok(achievementView.includes('@update:show="handleRejectShowChange"'), '驳回弹窗必须受控关闭');
  assert.ok(achievementView.includes(':loading="submitting"'), '附件下载必须保留独立 submitting');
  const downloadFn = achievementComposable.slice(
    achievementComposable.indexOf('const handleDownloadFile'),
    achievementComposable.indexOf('const handleApprove'),
  );
  assert.ok(downloadFn.includes('submitting.value'), '下载使用独立状态');
  assert.ok(!downloadFn.includes('mutating'), '下载不得占用审批写锁');
  assert.ok(!achievementComposable.includes('handleRejectSubmit = async () => {\n    if (!rejectReason'), '驳回必须共享 mutating 锁');
});

await test('资料变更页接线：数字 row key/选择列/批量入口/结果明细', () => {
  assert.ok(changeView.includes("type: 'selection'"), '资料变更表必须有选择列');
  assert.ok(changeView.includes(':row-key="(row: ProfileChangeVo) => row.id"'), '资料变更行 key 必须是数字 id');
  assert.ok(changeView.includes(':checked-row-keys="selectedIds"'), '选择必须受控');
  assert.ok(changeView.includes('@update:checked-row-keys="handleCheckedRowKeysChange"'), '选择变化必须经过校验');
  assert.ok(changeView.includes('@click="openBatchApprove"'), '必须有真实批量通过入口');
  assert.ok(changeView.includes('batchResult.failures'), '必须渲染失败明细');
  assert.ok(changeView.includes('failure.reason'), '必须渲染每条失败原因');
  assert.ok(changeView.includes("batchResult.failedCount > 0 ? 'warning' : 'success'"), '失败不得显示成功样式');
  assert.ok(!changeView.includes('batchApproveProfileChangeRequests('), '页面不得绕过组合式直接调 API');
});

await test('两个组合式：审批锁不用于下载，批量结果与错误状态独立存在', () => {
  assert.ok(changeComposable.includes('batchApproveProfileChangeRequests'), '资料变更批量必须复用既有 wrapper');
  assert.ok(changeComposable.includes('saving.value = true'), '批量必须共享 saving 写锁');
  assert.ok(achievementComposable.includes('batchApproveAchievements'), '成就必须调用真实批量 wrapper');
  assert.ok(achievementComposable.includes('mutating.value = true'), '审批必须共享 mutating 写锁');
});

await test('两页接线：在途弹窗禁止 Esc/遮罩关闭，确认占用位已共享', () => {
  assert.ok(achievementView.includes(':close-on-esc="!mutating"'), '成就打回弹窗在途必须禁止 Esc 关闭');
  assert.ok(changeView.includes(':close-on-esc="!saving"'), '资料变更审核弹窗在途必须禁止 Esc 关闭');
  assert.ok(achievementComposable.includes("beginConfirm('single')"), '成就单条通过必须占用共享确认位');
  assert.ok(achievementComposable.includes("beginConfirm('batch')"), '成就批量通过必须占用共享确认位');
  assert.ok(achievementComposable.includes("beginConfirm('reject')"), '成就打回必须占用共享确认位');
  assert.ok(changeComposable.includes("beginConfirm('single')"), '资料变更单条审核必须占用共享确认位');
  assert.ok(changeComposable.includes("beginConfirm('batch')"), '资料变更批量通过必须占用共享确认位');
});

// ==================================================
// E. 确认框生命周期与叠加防护（Esc / afterLeave / 迟到回调 / 重复弹窗）
// ==================================================
await test('成就批量确认：Esc/取消/X 等真实关闭路径都释放确认位，可再次打开', async () => {
  responder = listResponder([achRow(1)]);
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);

  // Esc/遮罩：Naive UI 只走 update:show → afterLeave，不触发 onClose/onNegativeClick
  assert.equal(state.openBatchApprove(), true);
  let options = dialogs.at(-1);
  assert.equal(typeof options.onAfterLeave, 'function', '批量确认必须挂 onAfterLeave 作为统一释放点');
  options.onAfterLeave();
  assert.equal(state.reviewConfirm.value, null, 'Esc/遮罩关闭后必须释放确认位');
  assert.equal(state.openBatchApprove(), true, 'Esc/遮罩关闭后必须能重新打开确认框');

  // 取消按钮
  options = dialogs.at(-1);
  assert.equal(options.onNegativeClick(), true, '非在途取消必须允许关闭');
  options.onAfterLeave();
  assert.equal(state.reviewConfirm.value, null, '取消关闭后必须释放确认位');
  assert.equal(state.openBatchApprove(), true, '取消关闭后必须能重新打开确认框');

  // X 关闭按钮
  options = dialogs.at(-1);
  assert.equal(options.onClose(), true, '非在途 X 必须允许关闭');
  options.onAfterLeave();
  assert.equal(state.openBatchApprove(), true, 'X 关闭后必须能重新打开确认框');
  assert.equal(posts().length, 0, '关闭确认框不得发请求');
});

await test('成就批量确认：旧框迟到的 afterLeave/onClose 不得释放新确认框占用', async () => {
  responder = listResponder([achRow(1)]);
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  state.openBatchApprove();
  const stale = dialogs[0];
  stale.onAfterLeave();
  assert.equal(state.openBatchApprove(), true, '旧框关闭后必须能打开新确认框');
  assert.equal(dialogs.length, 2);
  // 旧框迟到的生命周期回调不得释放新框占用
  stale.onAfterLeave();
  stale.onClose();
  assert.equal(state.reviewConfirm.value, 'batch', '新确认框占用不得被旧框迟到回调释放');
  assert.equal(state.openBatchApprove(), false, '占用仍在，不得叠加第三个确认框');
  assert.equal(dialogs.length, 2);
  dialogs[1].onAfterLeave();
  assert.equal(state.openBatchApprove(), true, '当前确认框关闭后必须能重新打开');
});

await test('成就批量确认：已取消的确认回调不得重放请求', async () => {
  responder = listResponder([achRow(1)], { successCount: 1, failedCount: 0, failures: [] });
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  state.openBatchApprove();
  const cancelled = dialogs[0];
  assert.equal(cancelled.onNegativeClick(), true, '非在途取消必须允许关闭');
  cancelled.onAfterLeave();
  assert.equal(await cancelled.onPositiveClick(), false, '已取消的确认不得提交');
  assert.equal(posts().length, 0, '已取消的确认不得发请求');
  state.openBatchApprove();
  const fresh = dialogs.at(-1);
  assert.equal(await cancelled.onPositiveClick(), false, '旧确认回调不得借用新确认框提交');
  assert.equal(posts().length, 0);
  await fresh.onPositiveClick();
  assert.equal(posts().length, 1, '新确认框必须能正常提交');
  assert.deepEqual(bodyOf(posts()[0]), { ids: [1] });
});

await test('成就批量确认：在途禁止关闭（Esc/遮罩禁用、X/取消拒绝），完成后恢复释放', async () => {
  const gate = deferred();
  responder = (url, init) =>
    init?.method === 'POST' ? gate.promise : json({ list: [achRow(1)], total: 1 });
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  state.openBatchApprove();
  const dlg = dialogs.at(-1);
  const pending = dlg.onPositiveClick();
  await tick();
  assert.equal(state.mutating.value, true);
  assert.equal(dlg.closeOnEsc, false, '在途必须禁用 Esc 关闭');
  assert.equal(dlg.maskClosable, false, '在途必须禁用遮罩关闭');
  assert.equal(await dlg.onClose(), false, '在途 X 不得关闭');
  assert.equal(await dlg.onNegativeClick(), false, '在途取消不得关闭');
  gate.resolve(json({ successCount: 1, failedCount: 0, failures: [] }));
  assert.equal(await pending, true);
  assert.equal(dlg.closeOnEsc, true, '完成后必须恢复 Esc');
  assert.equal(dlg.maskClosable, true, '完成后必须恢复遮罩');
  assert.equal(state.mutating.value, false);
  assert.equal(state.reviewConfirm.value, null, '完成后必须释放确认位');
  assert.equal(posts().length, 1, '在途互斥期间不得新增 POST');
});

await test('成就：批量/单条/打回确认互斥不得叠加，释放后可依次打开', async () => {
  responder = listResponder([achRow(1)]);
  const state = ach.useAchievementManage();
  await state.fetchList();
  state.handleCheckedRowKeysChange(['1']);
  assert.equal(state.openBatchApprove(), true);
  const batch = dialogs[0];
  assert.equal(state.handleApprove(state.list.value[0]), false, '批量确认打开期间不得再开单条通过确认');
  assert.equal(state.openRejectModal(state.list.value[0]), false, '批量确认打开期间不得开打回弹窗');
  assert.equal(dialogs.length, 1, '不得叠加确认框');
  batch.onNegativeClick();
  batch.onAfterLeave();
  assert.equal(state.openRejectModal(state.list.value[0]), true, '释放后打回弹窗可打开');
  assert.equal(state.handleApprove(state.list.value[0]), false, '打回弹窗打开期间不得开单条通过确认');
  assert.equal(state.openBatchApprove(), false, '打回弹窗打开期间不得开批量确认');
  assert.equal(state.closeRejectModal(), true);
  assert.equal(state.handleApprove(state.list.value[0]), true, '释放后可开单条通过确认');
  assert.equal(state.openBatchApprove(), false, '单条确认打开期间不得开批量确认');
  assert.equal(state.openRejectModal(state.list.value[0]), false, '单条确认打开期间不得开打回弹窗');
  dialogs.at(-1).onAfterLeave();
  assert.equal(state.openBatchApprove(), true, '单条确认关闭后可开批量确认');
});

await test('成就单条确认：快照 id、刷新后过时确认被拒绝并关闭、已消费不可重放', async () => {
  const gate = deferred();
  responder = (url, init) =>
    init?.method === 'POST' ? gate.promise : json({ list: [achRow(1)], total: 1 });
  const state = ach.useAchievementManage();
  await state.fetchList();
  // 弹窗后刷新（搜索/重置/翻页/页大小/重读）→ 本次确认过时
  assert.equal(state.handleApprove(state.list.value[0]), true);
  const stale = dialogs[0];
  await state.fetchList();
  assert.equal(await stale.onPositiveClick(), false, '过时确认必须被拒绝');
  assert.equal(posts().length, 0, '过时确认不得发请求');
  assert.ok(hasMessage('warning', '重新选择'), '过时确认必须提示重新选择');
  assert.equal(stale.__destroyed, true, '过时确认必须关闭弹窗');
  assert.equal(state.reviewConfirm.value, null, '过时确认必须释放确认位');
  // 重新打开并提交：使用打开时的 id 快照，只发一次，已消费回调不可重放
  assert.equal(state.handleApprove(state.list.value[0]), true, '过时确认释放后可重新打开');
  const single = dialogs.at(-1);
  const pending = single.onPositiveClick();
  await tick();
  assert.equal(state.mutating.value, true);
  assert.equal(await single.onPositiveClick(), false, '已消费的确认不得重复提交');
  const approvePosts = posts().filter((call) => call.url.endsWith('/approve'));
  assert.equal(approvePosts.length, 1, '单条通过只允许一次 POST');
  assert.equal(approvePosts[0].url, '/api/admin/achievements/1/approve', '必须提交打开确认时的 id 快照');
  gate.resolve(json(null));
  assert.equal(await pending, true);
  assert.equal(state.mutating.value, false);
  assert.equal(state.reviewConfirm.value, null);
});

await test('资料变更批量确认：Esc/取消/X 关闭释放确认位，旧框迟到回调不释放新框', async () => {
  responder = listResponder([changeRow(11)]);
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11]);

  assert.equal(state.openBatchApprove(), true);
  let options = dialogs.at(-1);
  assert.equal(typeof options.onAfterLeave, 'function', '批量确认必须挂 onAfterLeave 作为统一释放点');
  options.onAfterLeave();
  assert.equal(state.reviewConfirm.value, null, 'Esc/遮罩关闭后必须释放确认位');
  assert.equal(state.openBatchApprove(), true, 'Esc/遮罩关闭后必须能重新打开');

  options = dialogs.at(-1);
  assert.equal(options.onNegativeClick(), true, '非在途取消必须允许关闭');
  options.onAfterLeave();
  assert.equal(state.openBatchApprove(), true, '取消关闭后必须能重新打开');

  options = dialogs.at(-1);
  assert.equal(options.onClose(), true, '非在途 X 必须允许关闭');
  options.onAfterLeave();
  assert.equal(state.openBatchApprove(), true, 'X 关闭后必须能重新打开');

  // 旧框迟到的 afterLeave/onClose 不得释放新确认框占用
  const stale = dialogs.at(-1);
  stale.onAfterLeave();
  assert.equal(state.openBatchApprove(), true);
  const fresh = dialogs.at(-1);
  stale.onAfterLeave();
  stale.onClose();
  assert.equal(state.reviewConfirm.value, 'batch', '新确认框占用不得被旧框迟到回调释放');
  assert.equal(state.openBatchApprove(), false, '占用仍在，不得叠加确认框');
  fresh.onAfterLeave();
  assert.equal(state.openBatchApprove(), true, '当前确认框关闭后必须能重新打开');
  assert.equal(posts().length, 0, '关闭确认框不得发请求');
});

await test('资料变更批量确认：在途禁止关闭与重复提交，已取消确认不得重放', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST') return gate.promise;
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    return json({ list: [changeRow(11)], total: 1 });
  };
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11]);

  // 已取消的确认不得重放
  state.openBatchApprove();
  const cancelled = dialogs.at(-1);
  assert.equal(cancelled.onNegativeClick(), true);
  cancelled.onAfterLeave();
  assert.equal(await cancelled.onPositiveClick(), false, '已取消的确认不得提交');
  assert.equal(posts().length, 0, '已取消的确认不得发请求');

  // 在途禁止关闭、禁止重复提交
  assert.equal(state.openBatchApprove(), true);
  const dlg = dialogs.at(-1);
  const pending = dlg.onPositiveClick();
  await tick();
  assert.equal(state.saving.value, true);
  assert.equal(dlg.closeOnEsc, false, '在途必须禁用 Esc 关闭');
  assert.equal(dlg.maskClosable, false, '在途必须禁用遮罩关闭');
  assert.equal(await dlg.onClose(), false, '在途 X 不得关闭');
  assert.equal(await dlg.onNegativeClick(), false, '在途取消不得关闭');
  assert.equal(await dlg.onPositiveClick(), false, '在途重复确认不得重复请求');
  assert.equal(posts().length, 1);
  gate.resolve(json({ successCount: 1, failedCount: 0, failures: [] }));
  assert.equal(await pending, true);
  assert.equal(state.saving.value, false);
  assert.equal(state.reviewConfirm.value, null, '完成后必须释放确认位');
  assert.equal(dlg.closeOnEsc, true, '完成后必须恢复 Esc');
  assert.equal(dlg.maskClosable, true, '完成后必须恢复遮罩');
});

await test('资料变更：批量确认打开期间不得开单条审核弹窗，反向亦然', async () => {
  responder = listResponder([changeRow(11)]);
  const state = change.useUserChange();
  await state.fetchChanges();
  state.handleCheckedRowKeysChange([11]);
  assert.equal(state.openBatchApprove(), true);
  const batch = dialogs.at(-1);
  assert.equal(state.openApprove(changeRow(11)), false, '批量确认打开期间不得开单条审核弹窗');
  assert.equal(state.openReject(changeRow(11)), false, '批量确认打开期间不得开单条驳回弹窗');
  assert.equal(state.showReviewModal.value, false, '不得叠加审核弹窗');
  batch.onNegativeClick();
  batch.onAfterLeave();
  assert.equal(state.openApprove(changeRow(11)), true, '释放后可开单条审核弹窗');
  assert.equal(state.openBatchApprove(), false, '单条弹窗打开期间不得开批量确认');
  // 关闭单条弹窗后旧表单不得再提交，且确认位释放
  assert.equal(state.closeReview(), true);
  assert.equal(state.showReviewModal.value, false);
  assert.equal(await state.submitReview(), false, '已关闭的弹窗不得再提交');
  assert.equal(posts().length, 0, '已关闭的弹窗不得发请求');
  assert.equal(state.openBatchApprove(), true, '关闭单条弹窗后可开批量确认');
});

await test('资料变更单条审核：在途禁止关闭/切换，提交使用 id/reason 快照', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST') return gate.promise;
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    return json({ list: [changeRow(11)], total: 1 });
  };
  const state = change.useUserChange();
  await state.fetchChanges();
  assert.equal(state.openApprove(changeRow(11)), true);
  state.reviewForm.reason = '同意';
  const pending = state.submitReview();
  await tick();
  assert.equal(state.saving.value, true);
  assert.equal(state.openReject({ ...changeRow(11), id: 99 }), false, '在途不得换审核对象');
  assert.equal(state.closeReview(), false, '在途不得关闭审核弹窗');
  state.handleReviewShowChange(false);
  assert.equal(state.showReviewModal.value, true, '在途 Esc/遮罩不得关闭审核弹窗');
  assert.equal(await state.submitReview(), false, '在途不得重复提交');
  assert.equal(posts().length, 1);
  gate.resolve(json(null));
  assert.equal(await pending, true);
  const post = posts()[0];
  assert.equal(post.url, '/api/admin/profile-change-requests/11/approve');
  assert.deepEqual(bodyOf(post), { reason: '同意' }, '必须提交提交时的 id/reason 快照');
  assert.equal(state.saving.value, false);
  assert.equal(state.reviewConfirm.value, null);
});

await test('两页模态审核框：Esc/X/取消关闭后释放确认位，可再打开', async () => {
  // 成就打回弹窗（n-modal：Esc/遮罩/X 只发 update:show(false)）
  responder = listResponder([achRow(1)]);
  const state = ach.useAchievementManage();
  await state.fetchList();
  assert.equal(state.openRejectModal(state.list.value[0]), true);
  state.handleRejectShowChange(false);
  assert.equal(state.showRejectModal.value, false);
  assert.equal(state.reviewConfirm.value, null, '打回弹窗关闭后必须释放确认位');
  assert.equal(state.openRejectModal(state.list.value[0]), true, '释放后必须能重新打开打回弹窗');
  assert.equal(state.closeRejectModal(), true);
  // 无选择时批量确认仍然不得打开，也不得占用确认位
  assert.equal(state.openBatchApprove(), false);
  assert.equal(state.reviewConfirm.value, null);
  state.handleCheckedRowKeysChange(['1']);
  assert.equal(state.openBatchApprove(), true, '打回弹窗关闭后可开批量确认');

  // 资料变更审核弹窗
  responder = listResponder([changeRow(11)]);
  const changeState = change.useUserChange();
  await changeState.fetchChanges();
  assert.equal(changeState.openApprove(changeRow(11)), true);
  changeState.handleReviewShowChange(false);
  assert.equal(changeState.showReviewModal.value, false);
  assert.equal(changeState.reviewConfirm.value, null, '审核弹窗关闭后必须释放确认位');
  changeState.handleCheckedRowKeysChange([11]);
  assert.equal(changeState.openBatchApprove(), true, '审核弹窗关闭后可开批量确认');
});

console.log(failures ? `\n${failures} checks FAILED (${passed} passed)` : `\nall batch review behavior checks passed (${passed})`);
process.exitCode = failures ? 1 : 0;
