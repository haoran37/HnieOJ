// F-B2（管理通知 / 本人消息 / 自助资料 / 密码 / 身份变更审核）行为回归。
// 用受控 HTTP 桩（替换 globalThis.fetch）验证真实 API 路径与参数、组合式
// 竞态/失败保留/重复提交/UId 隔离，并用源码断言覆盖只能由页面承担的接线约束。
// 运行：node scripts/verify-remaining-b2.mjs（在仓库根目录）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

const root = process.cwd();
const dataUrl = (code) => 'data:text/javascript,' + encodeURIComponent(code);
const vueUrl = import.meta.resolve('vue');

// --------------------------------------------------
// 全局桩（naive-ui / vue-router / store）
// --------------------------------------------------
const messages = [];
globalThis.__msg = {
  success: (value) => messages.push({ type: 'success', value }),
  error: (value) => messages.push({ type: 'error', value }),
  warning: (value) => messages.push({ type: 'warning', value }),
  info: (value) => messages.push({ type: 'info', value }),
};
globalThis.__dialog = { warning: (opts) => { globalThis.__lastDialog = opts; } };

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

const lastCall = () => calls[calls.length - 1];
const queryOf = (call) => Object.fromEntries(new URL(call.url, 'http://localhost').searchParams.entries());
const lastQuery = () => queryOf(lastCall());
const bodyOf = (call) => JSON.parse(String(call.init?.body));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// --------------------------------------------------
// 真实模块
// --------------------------------------------------
const api = await import(pathToFileURL(path.join(root, 'src/utils/api.ts')).href);
const { useNotice } = await import(pathToFileURL(path.join(root, 'src/composables/admin/useNotice.ts')).href);
const { useUserChange } = await import(pathToFileURL(path.join(root, 'src/composables/admin/useUserChange.ts')).href);
const { useUserMessages, onUserMessagesChanged } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useUserMessages.ts')).href
);
const { useUserSettings, isValidAvatar } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useUserSettings.ts')).href
);

const readSrc = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
const noticeSource = readSrc('src/views/admin/ContentManage/Notice.vue');
const changeSource = readSrc('src/views/admin/UserManage/Change.vue');
const userMessageSource = readSrc('src/views/oj/UserPage/views/UserMessage.vue');
const userSettingSource = readSrc('src/views/oj/UserPage/views/UserSetting.vue');
const userSideBarSource = readSrc('src/views/oj/UserPage/components/UserSideBar.vue');
const userSidePanelSource = readSrc('src/views/oj/HomePage/components/UserSidePanel.vue');

let failures = 0;
async function test(name, fn) {
  messages.length = 0;
  calls = [];
  try {
    await fn();
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + ': ' + (error && error.message));
  }
}

// ==================================================
// A. API 契约（真实 src/utils/api.ts 生成路径/参数/请求体）
// ==================================================
await test('契约：管理通知列表/详情/创建/编辑/删除/发布路径与参数', async () => {
  responder = async () => json(null);
  await api.getAdminNotices({ page: 2, pageSize: 20, keyword: ' 期末 ', status: 'DRAFT' });
  assert.equal(lastCall().url.split('?')[0], '/api/admin/notices');
  assert.deepEqual(lastQuery(), { page: '2', pageSize: '20', keyword: '期末', status: 'DRAFT' });
  assert.equal(lastCall().init.method, 'GET');

  await api.getAdminNoticeDetail(5);
  assert.equal(lastCall().url, '/api/admin/notices/5');

  await api.createAdminNotice({ title: 't', content: 'c', targetType: 'USERS', targetIds: ['u1'] });
  assert.equal(lastCall().url, '/api/admin/notices');
  assert.equal(lastCall().init.method, 'POST');
  assert.deepEqual(bodyOf(lastCall()), { title: 't', content: 'c', targetType: 'USERS', targetIds: ['u1'] });

  await api.updateAdminNotice(5, { title: 't2', content: 'c2', targetType: 'CLASSES', targetIds: ['10'] });
  assert.equal(lastCall().url, '/api/admin/notices/5');
  assert.equal(lastCall().init.method, 'PUT');

  await api.publishAdminNotice(5);
  assert.equal(lastCall().url, '/api/admin/notices/5/publish');
  assert.equal(lastCall().init.method, 'POST');

  await api.deleteAdminNotice(5);
  assert.equal(lastCall().url, '/api/admin/notices/5');
  assert.equal(lastCall().init.method, 'DELETE');
});

await test('契约：本人消息系列路径与 unread 参数', async () => {
  responder = async () => json({ list: [], total: 0 });
  await api.getUserMessages(1, 10, true);
  assert.equal(lastCall().url.split('?')[0], '/api/user/messages');
  assert.deepEqual(lastQuery(), { page: '1', pageSize: '10', unread: 'true' });

  await api.getUserMessages(2, 10, false);
  assert.deepEqual(lastQuery(), { page: '2', pageSize: '10' });

  responder = async () => json(3);
  const count = await api.getUserMessageUnreadCount();
  assert.equal(lastCall().url, '/api/user/messages/unread-count');
  assert.equal(count, 3);

  responder = async () => json(null);
  await api.markUserMessageRead(7);
  assert.equal(lastCall().url, '/api/user/messages/7/read');
  assert.equal(lastCall().init.method, 'PUT');

  await api.markAllUserMessagesRead();
  assert.equal(lastCall().url, '/api/user/messages/read-all');
  assert.equal(lastCall().init.method, 'PUT');

  await api.deleteUserMessage(7);
  assert.equal(lastCall().url, '/api/user/messages/7');
  assert.equal(lastCall().init.method, 'DELETE');
});

await test('契约：自助资料/密码只走本人接口，密码 payload 不 trim', async () => {
  responder = async () => json(null);
  await api.updateUserProfile({ username: 'n', avatar: '', qq: '12345', github: 'https://g.com', blog: '' });
  assert.equal(lastCall().url, '/api/user/profile');
  assert.equal(lastCall().init.method, 'PUT');
  assert.deepEqual(bodyOf(lastCall()), {
    username: 'n',
    avatar: '',
    qq: '12345',
    github: 'https://g.com',
    blog: '',
  });

  await api.changeUserPassword({ oldPassword: ' old ', newPassword: ' new pass ' });
  assert.equal(lastCall().url, '/api/user/password');
  assert.equal(lastCall().init.method, 'PUT');
  assert.deepEqual(bodyOf(lastCall()), { oldPassword: ' old ', newPassword: ' new pass ' });
});

await test('契约：身份变更本人/管理端审核路径与请求体', async () => {
  responder = async () => json(null);
  await api.submitProfileChangeRequest({
    realname: '张三',
    collegeId: 1,
    grade: '2024',
    classId: 10,
    reason: '调整',
  });
  assert.equal(lastCall().url, '/api/user/profile-change-requests');
  assert.equal(lastCall().init.method, 'POST');

  await api.getMyProfileChangeRequests(1, 5);
  assert.equal(lastCall().url.split('?')[0], '/api/user/profile-change-requests');
  assert.deepEqual(lastQuery(), { page: '1', pageSize: '5' });

  await api.getAdminProfileChangeRequests({ page: 3, pageSize: 15, status: 'PENDING', keyword: ' 张 ' });
  assert.equal(lastCall().url.split('?')[0], '/api/admin/profile-change-requests');
  assert.deepEqual(lastQuery(), { page: '3', pageSize: '15', status: 'PENDING', keyword: '张' });

  await api.approveProfileChangeRequest(9, '同意');
  assert.equal(lastCall().url, '/api/admin/profile-change-requests/9/approve');
  assert.deepEqual(bodyOf(lastCall()), { reason: '同意' });

  await api.rejectProfileChangeRequest(9, '材料不足');
  assert.equal(lastCall().url, '/api/admin/profile-change-requests/9/reject');
  assert.deepEqual(bodyOf(lastCall()), { reason: '材料不足' });
});

// ==================================================
// B. 管理通知（AC1 / AC6）
// ==================================================
await test('通知列表：keyword/status/page 真实参数与服务端 total', async () => {
  responder = async () => json({ list: [{ id: 1, title: 'a', targetType: 'USERS', status: 'DRAFT' }], total: 42 });
  const state = useNotice();
  state.searchForm.keyword = '期末';
  state.searchForm.status = 'DRAFT';
  await state.fetchNotices();
  assert.deepEqual(lastQuery(), { page: '1', pageSize: '10', keyword: '期末', status: 'DRAFT' });
  assert.equal(state.totalCount.value, 42);
  state.handlePageChange(2);
  await tick();
  assert.equal(lastQuery().page, '2');
});

await test('通知详情：并发打开时旧响应不得覆盖新选择（已发布转只读）', async () => {
  let releaseFirst;
  responder = (url) => {
    if (url.endsWith('/1')) return new Promise((resolve) => { releaseFirst = resolve; });
    if (url.endsWith('/2')) return json({ id: 2, title: 'second', content: 'b2', targetType: 'USERS', targetIds: ['u2'], status: 'DRAFT' });
    return json({ list: [], total: 0 });
  };
  const state = useNotice();
  const pending = state.openDetailModal({ id: 1, title: 'first', status: 'DRAFT' });
  await state.openDetailModal({ id: 2, title: 'second', status: 'DRAFT' });
  releaseFirst(json({ id: 1, title: 'first', content: 'b1', targetType: 'USERS', targetIds: ['u1'], status: 'DRAFT' }));
  await pending;
  assert.equal(state.form.id, 2);
  assert.deepEqual(state.form.targetIds, ['u2']);

  responder = async () => json({ id: 3, title: 'pub', content: 'x', targetType: 'CLASSES', targetIds: ['10'], status: 'PUBLISHED' });
  await state.openDetailModal({ id: 3, title: 'pub', status: 'PUBLISHED' });
  assert.equal(state.modalMode.value, 'view');
});

await test('通知草稿：创建失败保留输入、不关闭，禁止重复提交', async () => {
  responder = async () => jsonMsg('title 非法', 400);
  const state = useNotice();
  state.openCreateModal();
  state.form.title = 'draft';
  state.form.content = 'body';
  state.form.targetIds = ['u1'];
  await state.handleSubmit();
  assert.equal(state.form.title, 'draft', '失败必须保留标题');
  assert.equal(state.form.content, 'body', '失败必须保留正文');
  assert.equal(state.showModal.value, true, '失败不得关闭弹窗');
  assert.equal(state.saving.value, false, '失败后释放保存锁');
});

await test('通知草稿：保存前去重、上限与空目标校验', async () => {
  responder = async () => json(null);
  const state = useNotice();
  state.openCreateModal();
  state.form.title = 't';
  state.form.content = 'c';
  state.form.targetIds = ['u1', 'u1', ' u2 '];
  await state.handleSubmit();
  const post = calls.find((c) => c.init?.method === 'POST');
  assert.equal(post.url, '/api/admin/notices');
  assert.deepEqual(bodyOf(post).targetIds, ['u1', 'u2']);

  state.openCreateModal();
  state.form.title = 't';
  state.form.content = 'c';
  state.form.targetIds = [];
  calls = [];
  await state.handleSubmit();
  assert.equal(calls.filter((c) => c.init?.method === 'POST').length, 0, '空收件目标必须本地拦截，不能手造名单/默认全校');
});

await test('通知草稿：切换收件方式清空旧目标，已保存 ID 可显示并删除', async () => {
  const state = useNotice();
  state.openCreateModal();
  state.form.targetIds = ['u1', 'u2'];
  state.handleTargetTypeChange('CLASSES');
  assert.deepEqual(state.form.targetIds, []);
  state.form.targetIds = ['10'];
  const options = state.classPickerOptions.value;
  const saved = options.find((o) => o.value === '10');
  assert.ok(saved, '已保存班级 ID 必须出现在选项中以便删除');
  assert.equal(saved.label, '班级 #10');
});

await test('通知发布：先读取受保护详情，确认后真实发布并刷新列表', async () => {
  responder = (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/5/publish')) return json(null);
    if (url.endsWith('/5')) return json({ id: 5, title: 'n', content: 'c', targetType: 'USERS', targetIds: ['u1', 'u2'], status: 'DRAFT' });
    return json({ list: [{ id: 5, title: 'n', status: 'DRAFT' }], total: 1 });
  };
  const state = useNotice();
  await state.openPublishConfirm({ id: 5, title: 'n', status: 'DRAFT' });
  assert.ok(state.publishDetail.value, '发布前必须读取收件目标');
  assert.deepEqual(state.publishDetail.value.targetIds, ['u1', 'u2']);
  await state.confirmPublish();
  const publishCall = calls.find((c) => c.url.endsWith('/5/publish'));
  assert.ok(publishCall, '确认后必须 POST publish');
  assert.ok(calls.some((c) => c.url.startsWith('/api/admin/notices?')), '发布成功后重新读取真实列表');
  assert.equal(state.publishing.value, false);
});

await test('通知发布：进行中重复点击不得重复提交', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/5/publish')) return gate.promise;
    return json({ list: [], total: 0 });
  };
  const state = useNotice();
  state.openPublishConfirm({ id: 5, title: 'n', status: 'DRAFT' });
  const first = state.confirmPublish();
  const second = state.confirmPublish();
  await tick();
  const publishCalls = calls.filter((c) => c.url.endsWith('/5/publish'));
  assert.equal(publishCalls.length, 1, '发布期间重复点击只能发一次');
  gate.resolve(json(null));
  await Promise.all([first, second]);
});

await test('通知删除：删除最后一页最后一条回退页码', async () => {
  responder = (url, init) => {
    if (init?.method === 'DELETE') return json(null);
    return json({ list: [{ id: 9, title: 'x', status: 'DRAFT' }], total: 1 });
  };
  const state = useNotice();
  state.currentPage.value = 2;
  state.notices.value = [{ id: 9, title: 'x', status: 'DRAFT' }];
  await state.handleDelete({ id: 9, title: 'x', status: 'DRAFT' });
  assert.equal(state.currentPage.value, 1);
});

await test('通知删除：进行中重复点击只发一次 DELETE，结束后释放锁', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'DELETE') return gate.promise;
    return json({ list: [], total: 0 });
  };
  const state = useNotice();
  const first = state.handleDelete({ id: 9, title: 'x', status: 'DRAFT' });
  const second = state.handleDelete({ id: 9, title: 'x', status: 'DRAFT' });
  await tick();
  assert.equal(
    calls.filter((c) => c.init?.method === 'DELETE').length,
    1,
    '删除期间重复点击只能发一次 DELETE',
  );
  assert.equal(state.deleting.value, true, '删除期间必须持有删除锁');
  gate.resolve(json(null));
  await Promise.all([first, second]);
  assert.equal(state.deleting.value, false, '删除结束后必须释放删除锁');
});

// ==================================================
// C. 管理身份变更审核（AC5 / AC6）
// ==================================================
const pendingRow = {
  id: 11,
  uid: 'u1',
  original: { realname: '张三', collegeId: 1, grade: '2024', classId: 10 },
  proposed: { realname: '张三', collegeId: 1, grade: '2024', classId: 11 },
  reason: '调整',
  status: 'PENDING',
};

await test('变更审核列表：status/keyword 分页真实参数，行数据用申请 VO', async () => {
  responder = (url) => {
    if (url.includes('/profile-change-requests')) return json({ list: [pendingRow], total: 1 });
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    return json(null);
  };
  const state = useUserChange();
  state.searchForm.status = 'PENDING';
  state.searchForm.keyword = 'u1';
  await state.fetchChanges();
  const changeCall = calls.find((c) => c.url.startsWith('/api/admin/profile-change-requests?'));
  assert.ok(changeCall, '必须请求管理端申请列表');
  assert.deepEqual(queryOf(changeCall), { page: '1', pageSize: '15', status: 'PENDING', keyword: 'u1' });
  assert.equal(state.changes.value[0].id, 11);
  await tick();
});

await test('变更审核：非 PENDING 不提供操作，驳回/通过都必须填写原因', async () => {
  responder = async () => json(null);
  const state = useUserChange();
  state.openApprove({ ...pendingRow, status: 'APPROVED' });
  assert.equal(state.showReviewModal.value, false, '已处理记录不得再审核');

  state.openApprove(pendingRow);
  assert.equal(state.showReviewModal.value, true);
  state.reviewForm.reason = '';
  await state.submitReview();
  assert.equal(calls.filter((c) => c.init?.method === 'POST').length, 0, '空原因不得提交');

  state.reviewForm.reason = 'x'.repeat(1001);
  await state.submitReview();
  assert.equal(calls.filter((c) => c.init?.method === 'POST').length, 0, '原因超过 1000 不得提交');
});

await test('变更审核：通过捕获申请 id 与原因，成功后刷新真实列表', async () => {
  responder = (url, init) => {
    if (init?.method === 'POST') return json(null);
    return json({ list: [{ ...pendingRow, status: 'APPROVED' }], total: 1 });
  };
  const state = useUserChange();
  state.openApprove(pendingRow);
  state.reviewForm.reason = ' 同意 ';
  await state.submitReview();
  const post = calls.find((c) => c.init?.method === 'POST');
  assert.equal(post.url, '/api/admin/profile-change-requests/11/approve');
  assert.deepEqual(bodyOf(post), { reason: '同意' });
  assert.equal(state.showReviewModal.value, false);
  assert.ok(calls.some((c) => c.url.startsWith('/api/admin/profile-change-requests?')), '成功后必须重新读取真实状态');
});

await test('变更审核：冲突保留错误并刷新真实状态，不假装成功', async () => {
  responder = (url, init) => {
    if (init?.method === 'POST') return jsonMsg('原值已变更', 400);
    return json({ list: [{ ...pendingRow, status: 'APPROVED' }], total: 1 });
  };
  const state = useUserChange();
  state.openApprove(pendingRow);
  state.reviewForm.reason = '同意';
  await state.submitReview();
  assert.ok(state.reviewError, '冲突必须保留错误信息');
  assert.equal(state.showReviewModal.value, true, '冲突时不得假装已处理并关闭');
  assert.equal(state.changes.value[0].status, 'APPROVED', '必须刷新为服务端真实状态');
  assert.equal(state.saving.value, false);
});

await test('变更审核：保存期间禁止切换到其它记录', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST') return gate.promise;
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    return json({ list: [pendingRow], total: 1 });
  };
  const state = useUserChange();
  state.openApprove(pendingRow);
  state.reviewForm.reason = '同意';
  const pending = state.submitReview();
  await tick();
  // 保存期间尝试切换到另一条申请必须被忽略
  state.openReject({ ...pendingRow, id: 99, uid: 'u2' });
  assert.equal(state.reviewForm.id, 11, '保存期间不得换记录');
  gate.resolve(json(null));
  await pending;
});

await test('变更审核：切换筛选后旧列表响应作废', async () => {
  let releaseFirst;
  responder = (url) => {
    if (url.includes('/colleges') || url.includes('/classes')) return json([]);
    if (url.includes('status=PENDING')) return new Promise((resolve) => { releaseFirst = resolve; });
    return json({ list: [{ ...pendingRow, status: 'APPROVED' }], total: 1 });
  };
  const state = useUserChange();
  state.searchForm.status = 'PENDING';
  const first = state.fetchChanges();
  state.searchForm.status = 'APPROVED';
  await state.fetchChanges();
  releaseFirst(json({ list: [pendingRow], total: 1 }));
  await first;
  assert.equal(state.changes.value[0].status, 'APPROVED', '旧筛选响应不得覆盖新筛选');
  await tick();
});

// ==================================================
// D. 本人消息（AC2 / AC6）
// ==================================================
const messageRow = { id: 100, noticeId: 5, title: 't', content: 'c', readAt: null, createdAt: '2026-09-20 10:00:00' };

await test('消息：分页/未读过滤与未读数真实读取', async () => {
  responder = (url) => {
    if (url.endsWith('/unread-count')) return json(3);
    return json({ list: [messageRow], total: 1 });
  };
  const state = useUserMessages();
  await state.refresh();
  assert.equal(state.unreadCount.value, 3);
  assert.equal(state.messages.value[0].id, 100);
  state.setUnreadOnly(true);
  await tick();
  assert.equal(lastQuery().unread, 'true');
});

await test('消息：单条已读/全部已读/删除走真实接口，重复提交有 guard', async () => {
  responder = (url, init) => {
    if (init?.method === 'PUT' && url.endsWith('/read')) return json(null);
    if (init?.method === 'PUT' && url.endsWith('/read-all')) return json(null);
    if (init?.method === 'DELETE') return json(null);
    if (url.endsWith('/unread-count')) return json(1);
    return json({ list: [messageRow], total: 1 });
  };
  const state = useUserMessages();
  await state.markRead(messageRow);
  assert.ok(calls.some((c) => c.url === '/api/user/messages/100/read'), '必须调用单条已读接口');

  calls = [];
  await state.markRead({ ...messageRow, readAt: '2026-09-20 11:00:00' });
  assert.equal(calls.length, 0, '已读消息不得重复标记');

  await state.markAllRead();
  assert.ok(calls.some((c) => c.url === '/api/user/messages/read-all'));

  calls = [];
  await state.remove(messageRow);
  assert.ok(calls.some((c) => c.init?.method === 'DELETE' && c.url === '/api/user/messages/100'));
});

await test('消息：删除最后一页最后一条回退页码', async () => {
  responder = (url, init) => {
    if (init?.method === 'DELETE') return json(null);
    if (url.endsWith('/unread-count')) return json(0);
    return json({ list: [messageRow], total: 1 });
  };
  const state = useUserMessages();
  state.currentPage.value = 2;
  state.messages.value = [messageRow];
  await state.remove(messageRow);
  assert.equal(state.currentPage.value, 1);
  const listCall = calls.filter((c) => c.url.startsWith('/api/user/messages?')).pop();
  assert.equal(queryOf(listCall).page, '1');
});

await test('消息：未读数读取失败保持 null，不伪 0', async () => {
  responder = async (url) => {
    if (url.endsWith('/unread-count')) throw new Error('网络失败');
    return json(null);
  };
  const state = useUserMessages();
  await state.fetchUnreadCount();
  assert.equal(state.unreadCount.value, null);
  assert.ok(state.unreadError.value, '失败必须记录错误');
});

await test('消息 UId 隔离：非本人页面任何方法都不发请求', async () => {
  responder = async () => json({ list: [messageRow], total: 1 });
  const state = useUserMessages({ isActive: () => false });
  calls = [];
  await state.refresh();
  await state.markRead(messageRow);
  await state.markAllRead();
  await state.remove(messageRow);
  assert.equal(calls.length, 0, '非本人页面不得访问 /api/user/messages');
});

await test('消息：reset 作废旧列表/未读数并清空详情、分页与错误', async () => {
  const unreadGate = deferred();
  responder = (url) => {
    if (url.endsWith('/unread-count')) return unreadGate.promise;
    return json({ list: [messageRow], total: 1 });
  };
  const state = useUserMessages();
  await state.fetchMessages();
  state.currentPage.value = 3;
  state.openDetail(messageRow);
  const pendingUnread = state.fetchUnreadCount();
  state.reset();
  unreadGate.resolve(json(9));
  await pendingUnread;
  assert.equal(state.unreadCount.value, null, 'reset 后旧未读数响应必须丢弃');
  assert.deepEqual(state.messages.value, [], 'reset 必须清空列表');
  assert.equal(state.totalCount.value, 0);
  assert.equal(state.currentPage.value, 1);
  assert.equal(state.detailMessage.value, null);
  assert.equal(state.showDetail.value, false);
  assert.equal(state.loading.value, false);
  assert.equal(state.error.value, null);
});

await test('消息：reset 后旧标记已读结果不触发新账号请求，并清锁', async () => {
  const readGate = deferred();
  responder = (url, init) => {
    if (init?.method === 'PUT' && url.endsWith('/read')) return readGate.promise;
    return json({ list: [], total: 0 });
  };
  const state = useUserMessages();
  const pending = state.markRead(messageRow);
  await tick();
  assert.equal(state.markingId.value, messageRow.id);
  state.reset();
  calls = [];
  readGate.resolve(json(null));
  await pending;
  assert.equal(calls.length, 0, 'reset 后旧 mutation 不得发起新账号刷新请求');
  assert.equal(state.markingId.value, null, 'reset 必须清除在途 mutation 标记');
});

await test('消息：工具栏刷新同时重读列表与未读数', async () => {
  responder = (url) => (url.endsWith('/unread-count') ? json(4) : json({ list: [], total: 0 }));
  const state = useUserMessages();
  state.currentPage.value = 3;
  calls = [];
  state.handleSearch();
  await tick();
  await tick();
  const listCall = calls.find((c) => c.url.startsWith('/api/user/messages?'));
  assert.ok(listCall, '刷新必须重读列表');
  assert.equal(queryOf(listCall).page, '1', '刷新回到第一页');
  assert.ok(calls.some((c) => c.url.endsWith('/unread-count')), '刷新必须同时重读未读数');
  assert.equal(state.unreadCount.value, 4);
});

await test('消息：读/删成功后派发未读变更事件供侧栏/首页刷新', async () => {
  const target = new EventTarget();
  globalThis.window = target;
  try {
    let fired = 0;
    const off = onUserMessagesChanged(() => {
      fired += 1;
    });
    responder = (url, init) => {
      if (init?.method === 'PUT' && url.endsWith('/read-all')) return json(null);
      if (url.endsWith('/unread-count')) return json(0);
      return json({ list: [], total: 0 });
    };
    const state = useUserMessages();
    await state.markAllRead();
    assert.equal(fired, 1, '全部已读成功后必须通知未读入口刷新');
    off();
    await state.markAllRead();
    assert.equal(fired, 1, '取消订阅后不得再收到事件');
  } finally {
    delete globalThis.window;
  }
});

// ==================================================
// E. 自助资料 / 密码 / 身份变更（AC3 / AC4）
// ==================================================
const profileData = {
  uid: '2024001',
  username: 'alice',
  email: 'a@example.com',
  avatar: '/oj/images/1/a.png',
  qq: '123456',
  github: 'https://github.com/me',
  blog: 'https://blog.example.com',
  realname: '张三',
  college: '计算机学院',
  collegeId: 1,
  class: '软件2401',
  classId: 10,
  grade: '2024',
  // 后端 UserProfileVo 的 Jackson 序列化为 snake_case
  cf_username: 'existing-cf',
};

await test('资料：真实加载并回填，uid/email 只读', async () => {
  responder = async (url) => {
    if (url === '/api/user/profile') return json(profileData);
    return json(null);
  };
  const state = useUserSettings();
  await state.loadProfile();
  assert.equal(state.profile.uid, '2024001');
  assert.equal(state.profile.email, 'a@example.com');
  assert.equal(state.profile.username, 'alice');
  assert.equal(state.profile.collegeId, 1);
  assert.equal(state.profile.classId, 10);
  assert.equal(state.profile.cfUsername, 'existing-cf', '响应 cf_username 必须回填到 profile.cfUsername');
  assert.equal(state.profileLoaded.value, true);
  assert.equal(state.identity.collegeId, 1, '身份申请以当前资料为默认起点');
});

await test('资料保存：只提交白名单字段，成功后重新读取 profile', async () => {
  responder = (url, init) => {
    if (init?.method === 'PUT') return json(null);
    if (url === '/api/user/profile') return json({ ...profileData, username: 'alice2', qq: '' });
    return json(null);
  };
  const state = useUserSettings();
  await state.loadProfile();
  state.profile.username = 'alice2';
  state.profile.qq = '';
  state.profile.github = 'https://github.com/me2';
  calls = [];
  const ok = await state.saveProfile();
  assert.equal(ok, true);
  const put = calls.find((c) => c.init?.method === 'PUT');
  assert.deepEqual(Object.keys(bodyOf(put)).sort(), ['avatar', 'blog', 'github', 'qq', 'username']);
  assert.equal(Object.prototype.hasOwnProperty.call(bodyOf(put), 'uid'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(bodyOf(put), 'email'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(bodyOf(put), 'collegeId'), false);
  assert.equal(state.profile.username, 'alice2', '保存后重新读取真实 profile');
});

await test('资料保存：失败保留表单，不清空输入', async () => {
  responder = (url, init) => {
    if (init?.method === 'PUT') return jsonMsg('QQ 格式错误', 400);
    if (url === '/api/user/profile') return json(profileData);
    return json(null);
  };
  const state = useUserSettings();
  await state.loadProfile();
  state.profile.username = 'keep-me';
  state.profile.qq = 'bad';
  const ok = await state.saveProfile();
  assert.equal(ok, false);
  assert.equal(state.profile.username, 'keep-me');
  assert.equal(state.profile.qq, 'bad');
  assert.equal(state.savingProfile.value, false);
});

await test('资料保存：空/空白头像允许清除，非空不安全 URL 仍拒绝', async () => {
  responder = (url, init) => {
    if (init?.method === 'PUT') return json(null);
    if (url === '/api/user/profile') return json({ ...profileData, avatar: '' });
    return json(null);
  };
  const state = useUserSettings();
  await state.loadProfile();
  state.profile.avatar = '';
  state.profile.github = '   ';
  state.profile.blog = '   ';
  calls = [];
  const ok = await state.saveProfile();
  assert.equal(ok, true, '空头像必须视为合法的清除操作');
  const put = calls.find((c) => c.init?.method === 'PUT');
  assert.equal(bodyOf(put).avatar, '', '空头像原样作为清除提交');
  assert.equal(bodyOf(put).github, '', '空白 github 归一为空串');
  assert.equal(bodyOf(put).blog, '', '空白 blog 归一为空串');
  assert.equal(state.profile.avatar, '', '保存后重新读取真实 profile');

  state.profile.avatar = 'javascript:alert(1)';
  calls = [];
  assert.equal(await state.saveProfile(), false);
  assert.equal(
    calls.filter((c) => c.init?.method === 'PUT').length,
    0,
    '非空不安全头像必须本地拦截',
  );
});

await test('资料头像/URL 校验：拒绝 javascript:/data:/协议相对，接受 http(s) 与站内路径', () => {
  assert.equal(isValidAvatar('/oj/images/1/a.png'), true);
  assert.equal(isValidAvatar('https://example.com/a.png'), true);
  assert.equal(isValidAvatar('http://example.com/a.png'), true);
  assert.equal(isValidAvatar('javascript:alert(1)'), false);
  assert.equal(isValidAvatar('data:image/png;base64,xx'), false);
  assert.equal(isValidAvatar('//evil.example.com/a.png'), false);
  assert.equal(isValidAvatar('x'.repeat(501)), false);
});

await test('资料：切换账号/route 后旧 profile 响应作废，不填他人资料', async () => {
  const gate = deferred();
  responder = (url) => {
    if (url === '/api/user/profile') return gate.promise;
    return json(null);
  };
  const state = useUserSettings();
  const pending = state.loadProfile();
  state.reset();
  gate.resolve(json(profileData));
  await pending;
  assert.equal(state.profile.uid, '', 'reset 后到达的旧响应必须被丢弃');
  assert.equal(state.profileLoaded.value, false);
});

await test('资料：reset 后在途保存成功不重载资料也不返回成功', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'PUT') return gate.promise;
    if (url === '/api/user/profile') return json(profileData);
    return json(null);
  };
  const state = useUserSettings();
  await state.loadProfile();
  state.profile.username = 'alice2';
  calls = [];
  const pending = state.saveProfile();
  await tick();
  assert.equal(state.savingProfile.value, true, '保存期间必须持有保存锁');
  state.reset();
  gate.resolve(json(null));
  const ok = await pending;
  assert.equal(ok, false, 'reset 后旧保存结果不得返回成功');
  assert.equal(
    calls.filter((c) => c.url === '/api/user/profile' && c.init?.method === 'GET').length,
    0,
    'reset 后不得为新账号重载资料',
  );
  assert.equal(state.savingProfile.value, false, 'reset 必须清除在途保存锁');
});

await test('密码：两次不一致/长度不足/空字段本地拦截', async () => {
  responder = async () => json(null);
  const state = useUserSettings();
  state.passwordForm.oldPassword = 'old';
  state.passwordForm.newPassword = 'newpass1';
  state.passwordForm.confirmPassword = 'different';
  assert.equal(await state.submitPassword(), false);
  assert.equal(calls.length, 0);

  state.passwordForm.confirmPassword = 'newpass1';
  state.passwordForm.newPassword = '12345';
  assert.equal(await state.submitPassword(), false);
  assert.equal(calls.length, 0);

  state.passwordForm.oldPassword = '';
  state.passwordForm.newPassword = 'newpass1';
  state.passwordForm.confirmPassword = 'newpass1';
  assert.equal(await state.submitPassword(), false);
  assert.equal(calls.length, 0);
});

await test('密码：成功走 PUT /api/user/password、原样不 trim、清空字段', async () => {
  responder = async (url, init) => {
    if (init?.method === 'PUT') return json(null);
    return json(null);
  };
  const state = useUserSettings();
  state.passwordForm.oldPassword = ' old pass ';
  state.passwordForm.newPassword = ' newpass1 ';
  state.passwordForm.confirmPassword = ' newpass1 ';
  const ok = await state.submitPassword();
  assert.equal(ok, true);
  const put = calls.find((c) => c.init?.method === 'PUT');
  assert.equal(put.url, '/api/user/password');
  assert.deepEqual(bodyOf(put), { oldPassword: ' old pass ', newPassword: ' newpass1 ' });
  assert.equal(state.passwordForm.oldPassword, '');
  assert.equal(state.passwordForm.newPassword, '');
  assert.equal(state.passwordForm.confirmPassword, '');
});

await test('密码：旧密码错误（400）时返回 false 且保留输入、不清会话标记', async () => {
  responder = async () => jsonMsg('旧密码错误', 1003);
  const state = useUserSettings();
  state.passwordForm.oldPassword = 'wrong';
  state.passwordForm.newPassword = 'newpass1';
  state.passwordForm.confirmPassword = 'newpass1';
  const ok = await state.submitPassword();
  assert.equal(ok, false);
  assert.equal(state.passwordForm.oldPassword, 'wrong', '失败必须保留输入');
  assert.equal(state.changingPassword.value, false);
});

await test('密码：reset 后在途成功返回 false，不触发新账号退出', async () => {
  const gate = deferred();
  responder = (url, init) => (init?.method === 'PUT' ? gate.promise : json(null));
  const state = useUserSettings();
  state.passwordForm.oldPassword = 'old';
  state.passwordForm.newPassword = 'newpass1';
  state.passwordForm.confirmPassword = 'newpass1';
  const pending = state.submitPassword();
  await tick();
  assert.equal(state.changingPassword.value, true, '提交期间必须持有修改锁');
  state.reset();
  gate.resolve(json(null));
  const ok = await pending;
  assert.equal(ok, false, 'reset 后旧密码请求的成功结果不得让调用方退出新账号');
  assert.equal(state.changingPassword.value, false, 'reset 必须清除在途修改锁');
});

await test('身份申请：pending 时禁止重复提交，原因必填', async () => {
  responder = async (url) => {
    if (url.includes('profile-change-requests')) return json({ list: [pendingRow], total: 1 });
    return json(null);
  };
  const state = useUserSettings();
  await state.fetchMyRequests();
  state.hasPending.value = true;
  calls = [];
  assert.equal(await state.submitIdentity(), false);
  assert.equal(calls.filter((c) => c.init?.method === 'POST').length, 0, 'pending 时不得重复申请');

  state.hasPending.value = false;
  state.identity.realname = '张三';
  state.identity.collegeId = 1;
  state.identity.grade = '2024';
  state.identity.classId = 10;
  state.identity.reason = '';
  assert.equal(await state.submitIdentity(), false);
  assert.equal(calls.filter((c) => c.init?.method === 'POST').length, 0);
});

await test('身份申请：真实 POST 四项身份字段 + reason，成功后刷新申请列表', async () => {
  responder = (url, init) => {
    if (init?.method === 'POST') return json(null);
    if (url.includes('profile-change-requests')) return json({ list: [pendingRow], total: 1 });
    return json(null);
  };
  const state = useUserSettings();
  state.identity.realname = ' 张三 ';
  state.identity.collegeId = 1;
  state.identity.grade = '2024';
  state.identity.classId = 11;
  state.identity.reason = ' 班级调整 ';
  const ok = await state.submitIdentity();
  assert.equal(ok, true);
  const post = calls.find((c) => c.init?.method === 'POST');
  assert.equal(post.url, '/api/user/profile-change-requests');
  assert.deepEqual(bodyOf(post), { realname: '张三', collegeId: 1, grade: '2024', classId: 11, reason: '班级调整' });
  assert.ok(calls.some((c) => c.url.startsWith('/api/user/profile-change-requests?')), '提交成功后刷新本人申请列表');
});

await test('身份申请：CF 用户名同值不提交，新值按 cfUsername 真实提交', async () => {
  responder = (url, init) => {
    if (init?.method === 'POST') return json(null);
    if (url === '/api/user/profile') return json(profileData);
    if (url.includes('profile-change-requests')) return json({ list: [], total: 0 });
    return json(null);
  };
  const state = useUserSettings();
  await state.loadProfile();
  assert.equal(state.profile.cfUsername, 'existing-cf');

  // 与当前资料同值：不构成 changedProfileFields，不发 POST
  state.identity.cfUsername = 'existing-cf';
  state.identity.reason = '确认 CF 用户名';
  calls = [];
  assert.equal(await state.submitIdentity(), false);
  assert.equal(
    calls.filter((c) => c.init?.method === 'POST').length,
    0,
    '同值 CF 用户名不得提交资料变更申请',
  );

  // 新值：请求体使用后端 ProfileChangeCreateRequest 的 cfUsername
  state.identity.cfUsername = 'new-cf';
  calls = [];
  assert.equal(await state.submitIdentity(), true);
  const post = calls.find((c) => c.init?.method === 'POST');
  assert.equal(post.url, '/api/user/profile-change-requests');
  const body = bodyOf(post);
  assert.equal(body.cfUsername, 'new-cf', '申请体必须使用 camelCase cfUsername');
  assert.equal(
    Object.prototype.hasOwnProperty.call(body, 'cf_username'),
    false,
    '申请体不得出现响应侧 snake_case',
  );
});

await test('身份申请：reset 后在途成功不刷新新账号申请列表', async () => {
  const gate = deferred();
  responder = (url, init) => {
    if (init?.method === 'POST') return gate.promise;
    if (url.includes('profile-change-requests')) return json({ list: [], total: 0 });
    return json(null);
  };
  const state = useUserSettings();
  state.identity.realname = '张三';
  state.identity.collegeId = 1;
  state.identity.grade = '2024';
  state.identity.classId = 10;
  state.identity.reason = '调整';
  const pending = state.submitIdentity();
  await tick();
  assert.equal(state.submittingIdentity.value, true, '提交期间必须持有提交锁');
  state.reset();
  calls = [];
  gate.resolve(json(null));
  const ok = await pending;
  assert.equal(ok, false, 'reset 后旧提交结果不得返回成功');
  assert.equal(calls.length, 0, 'reset 后不得为新账号刷新申请列表');
  assert.equal(state.submittingIdentity.value, false, 'reset 必须清除在途提交锁');
});

await test('身份申请：学院/年级级联旧班级响应作废', async () => {
  const classResolvers = [];
  responder = (url) => {
    if (url.includes('/classes')) {
      const is2022 = url.includes('/2022/');
      return new Promise((resolve) => {
        classResolvers.push(() =>
          resolve(json([{ id: is2022 ? 99 : 98, name: is2022 ? '旧班级' : '新班级' }])),
        );
      });
    }
    return json([]);
  };
  const state = useUserSettings();
  state.identity.collegeId = 1;
  const pending = state.handleIdentityGradeChange('2022');
  const current = state.handleIdentityGradeChange('2023');
  await tick();
  classResolvers.forEach((release) => release());
  await Promise.all([pending, current]);
  assert.ok(
    state.identityClassOptions.value.every((o) => o.label !== '旧班级'),
    '旧年级的班级响应必须被丢弃',
  );
  assert.ok(state.identityClassOptions.value.some((o) => o.label === '新班级'), '新年级班级必须保留');
});

await test('身份申请：本人/管理数据在 isActive=false 时不发任何请求', async () => {
  responder = async () => json(null);
  const state = useUserSettings({ isActive: () => false });
  calls = [];
  await state.loadAll();
  await state.saveProfile();
  await state.submitPassword();
  await state.submitIdentity();
  assert.equal(calls.length, 0, '非本人页面不得加载/提交资料');
});

// ==================================================
// F. 页面接线源码约束（无法在 Node 下渲染模板的部分）
// ==================================================
await test('页面隔离：消息/设置页比较 route uid 与本人 uid，并传 isActive', () => {
  for (const [name, source] of [
    ['UserMessage.vue', userMessageSource],
    ['UserSetting.vue', userSettingSource],
  ]) {
    assert.ok(/route\.params\.uid/.test(source), `${name} 必须读取 route uid`);
    assert.ok(/userStore\.userInfo\?\.id/.test(source), `${name} 必须取本人 uid`);
    assert.ok(source.includes('isSelf'), `${name} 必须使用 isSelf 判定`);
    assert.ok(source.includes('isActive: () => isSelf.value'), `${name} 必须用 isSelf 作为 isActive`);
    assert.ok(!source.includes('v-html'), `${name} 不得用 v-html 渲染不可信内容`);
  }
});

await test('首页/侧栏仅显示本人真实未读数，失败不伪 0', () => {
  assert.ok(userSidePanelSource.includes('getUserMessageUnreadCount'), '首页消息入口必须读取真实未读数');
  assert.ok(userSideBarSource.includes('getUserMessageUnreadCount'), '个人侧栏必须读取真实未读数');
  assert.ok(userSideBarSource.includes('isSelf'), '侧栏消息入口仅本人可见');
  for (const source of [userSidePanelSource, userSideBarSource]) {
    assert.ok(!source.includes('Math.random'), '未读入口不得使用随机数');
  }
});

await test('页面隔离：路由/账号切换同步 reset，并在卸载时作废在途请求', () => {
  for (const [name, source] of [
    ['UserMessage.vue', userMessageSource],
    ['UserSetting.vue', userSettingSource],
  ]) {
    assert.ok(source.includes('reset('), `${name} 必须在路由/账号切换时调用组合式 reset`);
    assert.ok(source.includes("flush: 'sync'"), `${name} 的账号/路由 watcher 必须同步作废旧数据`);
    assert.ok(source.includes('onBeforeUnmount'), `${name} 卸载时必须作废在途请求`);
    assert.ok(!source.includes('v-html'), `${name} 不得用 v-html 渲染不可信内容`);
  }
});

await test('侧栏/首页未读数：请求序号防串号，并订阅收件箱变更事件刷新', () => {
  for (const [name, source] of [
    ['UserSideBar.vue', userSideBarSource],
    ['UserSidePanel.vue', userSidePanelSource],
  ]) {
    assert.ok(source.includes('unreadSeq'), `${name} 未读数必须有序号作废旧响应`);
    assert.ok(source.includes('onUserMessagesChanged'), `${name} 必须订阅本人消息变更事件`);
    assert.ok(source.includes('onBeforeUnmount'), `${name} 卸载时必须取消订阅并作废在途未读数`);
    assert.ok(!source.includes('Math.random'), `${name} 不得使用随机数`);
  }
});

await test('通知页：列含标题/目标类型/状态/时间，无 v-html，发布/删除文案明确', () => {
  assert.ok(noticeSource.includes("title: '标题'"), '通知列表必须有标题列');
  assert.ok(noticeSource.includes("title: '目标类型'"), '通知列表必须有目标类型列');
  assert.ok(noticeSource.includes("title: '状态'"), '通知列表必须有状态列');
  assert.ok(noticeSource.includes("title: '创建时间'") && noticeSource.includes("title: '发布时间'"), '通知列表必须有时间列');
  assert.ok(noticeSource.includes('发布后不可撤回'), '发布确认必须提示不可撤回');
  assert.ok(noticeSource.includes('不会撤回已投递'), '删除确认必须说明不撤回已投递消息');
  assert.ok(!noticeSource.includes('v-html'), '通知正文不得 v-html 渲染');
  assert.ok(noticeSource.includes('userPickerOptions') && noticeSource.includes('classPickerOptions'), '收件目标必须来自真实查询');
});

await test('变更页：行 key 为申请 id，仅 PENDING 操作，无占位批量按钮', () => {
  assert.ok(changeSource.includes('row.id'), '行数据必须以申请 id 为 key');
  assert.ok(changeSource.includes('PENDING'), '必须识别待处理状态');
  assert.ok(!changeSource.includes('批量通过'), '不得保留 disabled 占位批量按钮');
  assert.ok(changeSource.includes('openApprove') && changeSource.includes('openReject'));
});

await test('安全：密码不写 localStorage，自助资料不打印密码字段', () => {
  const settings = readSrc('src/composables/oj/useUserSettings.ts');
  assert.ok(!settings.includes('localStorage'), '密码/资料组合式不得写本地存储');
  assert.ok(!settings.includes('console.log'), '不得打印密码或资料');
  assert.ok(!userSettingSource.includes('localStorage'), '设置页不得写本地存储');
});

await test('保留成就认证 multipart 上传与受控 fileList', () => {
  assert.ok(userSettingSource.includes('submitAchievementApply'), '必须保留真实成就上传接');
  assert.ok(userSettingSource.includes('fileList') && userSettingSource.includes('handleFileChange'), '必须保留受控 fileList');
  assert.ok(userSettingSource.includes('new FormData()'), '必须保留 multipart 提交');
});

console.log(failures ? `\n${failures} checks FAILED` : '\nall remaining-b2 behavior checks passed');
process.exitCode = failures ? 1 : 0;
