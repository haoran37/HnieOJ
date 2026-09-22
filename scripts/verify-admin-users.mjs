// 本批（admin-users）最小回归：
// - 用户/注册/权限/成就/系统配置 真实请求路径与请求体契约
// - 纯映射函数（角色多值、注册状态整数、成就附件本地/外部判别、系统配置枚举）
// - useSystemConfig 组合式行为：registerMode 原样保留 + smtpPassword 留空省略 + 保存后重读（R8）
// - useUserManage 班级师资并发作废（teachers/tas 同班级真实调用）
// - 源码级检查：Service.vue 返回真实 Promise、凭据不写 localStorage、本批无 mock/delay
// 运行：node scripts/verify-admin-users.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

import {
  addUserAchievement,
  approveAchievement,
  approveRegistration,
  batchApproveRegistrations,
  batchDeleteUsers,
  batchDisableUsers,
  batchEnableUsers,
  batchRevokePermissions,
  checkUser,
  createUser,
  deleteUser,
  deleteUserAchievement,
  downloadAchievementApplyFile,
  downloadUserImportTemplate,
  getAdminAchievements,
  getClassTas,
  getClassTeachers,
  getPermissionUsers,
  getRegistrations,
  getUsers,
  grantPermissions,
  rejectAchievement,
  rejectRegistration,
  revokeUserPermission,
  saveAdminSystemConfig,
  searchAdminUsers,
  updateUser,
  updateUserPassword,
  updateUserPermission,
} from '../src/utils/api.ts';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}
async function checkAsync(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

// ---- 可观测 fetch / localStorage ----
const storage = new Map([['token', 'real-token']]);
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const calls = [];
let responder = async () => json({ code: 200, msg: 'ok', data: null });
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  return responder(String(url), init);
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function lastCall() {
  return calls[calls.length - 1];
}
function lastBody() {
  return lastCall().init.body ? JSON.parse(lastCall().init.body) : null;
}
function lastUrl() {
  return new URL(lastCall().url, 'http://localhost');
}
function lastQuery() {
  return Object.fromEntries(lastUrl().searchParams.entries());
}

// ---- 桩换 naive-ui，供组合式模块在 Node 下导入 ----
globalThis.__msg = { success() {}, error() {}, warning() {}, info() {} };
// 记录最后一次对话框参数，供审批互斥用例真实调用 onPositiveClick
globalThis.__dialog = {
  info: (opts) => {
    globalThis.__lastDialog = opts;
  },
  warning: (opts) => {
    globalThis.__lastDialog = opts;
  },
  error: (opts) => {
    globalThis.__lastDialog = opts;
  },
  success: (opts) => {
    globalThis.__lastDialog = opts;
  },
};
const naiveStub =
  'data:text/javascript,' +
  encodeURIComponent(
    'export const useMessage = () => globalThis.__msg; export const useDialog = () => globalThis.__dialog;',
  );

const root = process.cwd();
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'naive-ui') return { url: naiveStub, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      let target = path.join(root, 'src', specifier.slice(2));
      if (!path.extname(target)) target = `${target}.ts`;
      return next(pathToFileURL(target).href, context);
    }
    return next(specifier, context);
  },
});

const { useSystemConfig, toSystemConfig, toSaveRequest, REGISTER_MODES } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useSystemConfig.ts'))
);
const { useUserManage, toUserItem } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useUserManage.ts'))
);
const { pickManageableRole, usePermissionManage } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/usePermissionManage.ts'))
);
const { toRegistrationItem, REGISTER_STATUS, useRegistration } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useRegistration.ts'))
);
const { toAchievementApplication, isExternalFile } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useAchievementManage.ts'))
);

// --------------------------------------------------
// A. 真实请求契约
// --------------------------------------------------
await checkAsync('用户列表：/api/user/users 只发送后端支持的筛选与分页字段', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await getUsers({ keyword: ' 张三 ', collegeId: 3, grade: '2022', classId: 9, page: 2, pageSize: 15 });
  const query = lastQuery();
  assert.equal(lastCall().url.split('?')[0], '/api/user/users');
  assert.equal(query.keyword, '张三');
  assert.equal(query.collegeId, '3');
  assert.equal(query.grade, '2022');
  assert.equal(query.classId, '9');
  assert.equal(query.page, '2');
  assert.equal(query.pageSize, '15');
});

await checkAsync('用户查验：/api/user/check?query= 且带 Bearer', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: { exists: true, uid: 'u1', username: 'n1' } });
  const result = await checkUser('u1');
  assert.equal(lastCall().url, '/api/user/check?query=u1');
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token');
  assert.equal(result.exists, true);
});

await checkAsync('创建/更新/改密/删除/批量：路径与请求体符合 DTO', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: { uid: 'u1', initialPassword: 'init' } });
  await createUser({
    uid: 'u1', username: 'n1', email: 'a@b.c', password: '123456',
    collegeId: 1, classId: 2, grade: '2022',
  });
  assert.equal(lastCall().url, '/api/users');
  assert.equal(lastCall().init.method, 'POST');
  assert.deepEqual(lastBody(), {
    uid: 'u1', username: 'n1', email: 'a@b.c', password: '123456',
    collegeId: 1, classId: 2, grade: '2022',
  });

  responder = async () => json({ code: 200, msg: 'ok', data: null });
  await updateUser('u1', { username: 'n1x', status: 1, collegeId: 1, classId: 2, grade: '2022' });
  assert.equal(lastCall().url, '/api/users/u1');
  assert.equal(lastCall().init.method, 'PUT');
  assert.deepEqual(lastBody(), { username: 'n1x', status: 1, collegeId: 1, classId: 2, grade: '2022' });

  await updateUserPassword('u1', 'newpass');
  assert.equal(lastCall().url, '/api/users/u1/password');
  assert.deepEqual(lastBody(), { password: 'newpass' });

  await deleteUser('u1');
  assert.equal(lastCall().url, '/api/users/u1');
  assert.equal(lastCall().init.method, 'DELETE');

  await batchDisableUsers(['a', 'b']);
  assert.equal(lastCall().url, '/api/users/batch/disable');
  assert.deepEqual(lastBody(), { uids: ['a', 'b'] });

  await batchEnableUsers(['a']);
  assert.equal(lastCall().url, '/api/users/batch/enable');
  assert.deepEqual(lastBody(), { uids: ['a'] });

  await batchDeleteUsers(['a']);
  assert.equal(lastCall().url, '/api/users/batch');
  assert.equal(lastCall().init.method, 'DELETE');
  assert.deepEqual(lastBody(), { uids: ['a'] });
});

await checkAsync('权限：列表/搜索/grant/update/revoke/batch-revoke 全部真实', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await getPermissionUsers(1, 10);
  assert.equal(lastCall().url, '/api/admin/permission/users?page=1&pageSize=10');

  await searchAdminUsers(' 李四 ', 2, 5);
  assert.equal(lastCall().url.split('?')[0], '/api/admin/users/search');
  assert.equal(lastQuery().query, '李四');
  assert.equal(lastQuery().page, '2');

  responder = async () => json({ code: 200, msg: 'ok', data: null });
  await grantPermissions(['u1', 'u2'], 'TA');
  assert.equal(lastCall().url, '/api/admin/permission/grant');
  assert.deepEqual(lastBody(), { uids: ['u1', 'u2'], role: 'TA' });

  await updateUserPermission('u1', 'TEACHER');
  assert.equal(lastCall().url, '/api/admin/permission/update');
  assert.deepEqual(lastBody(), { uid: 'u1', role: 'TEACHER' });

  await revokeUserPermission('u1');
  assert.equal(lastCall().url, '/api/admin/permission/revoke?uid=u1');
  assert.equal(lastCall().init.method, 'DELETE');

  await batchRevokePermissions(['u1', 'u2']);
  assert.equal(lastCall().url, '/api/admin/permission/batch-revoke');
  assert.equal(lastCall().init.method, 'DELETE');
  assert.deepEqual(lastBody(), { uids: ['u1', 'u2'] });
});

await checkAsync('注册审核：列表/approve/reject(reason)/batch-approve 真实', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await getRegistrations(1, 15, REGISTER_STATUS.PENDING, '张');
  const query = lastQuery();
  assert.equal(lastCall().url.split('?')[0], '/api/registrations');
  assert.equal(query.status, '0');
  assert.equal(query.keyword, '张');

  responder = async () => json({ code: 200, msg: 'ok', data: null });
  await approveRegistration('u1');
  assert.equal(lastCall().url, '/api/registrations/u1/approve');
  assert.equal(lastCall().init.method, 'POST');

  await rejectRegistration('u1', '资料不全');
  assert.equal(lastCall().url, '/api/registrations/u1/reject');
  assert.deepEqual(lastBody(), { reason: '资料不全' });

  responder = async () => json({ code: 200, msg: 'ok', data: '成功: 1, 失败: 0' });
  const summary = await batchApproveRegistrations(['u1']);
  assert.equal(lastCall().url, '/api/registrations/batch/approve');
  assert.deepEqual(lastBody(), { uids: ['u1'] });
  assert.equal(summary, '成功: 1, 失败: 0');
});

await checkAsync('注册审批：三个确认入口共享 submitting 互斥，在途返回 false 且不重复请求', async () => {
  const postUrls = [];
  let releaseApprove;
  responder = (url, init) => {
    if (init?.method === 'POST') {
      postUrls.push(String(url));
      if (String(url).endsWith('/approve') && !releaseApprove) {
        return new Promise((resolve) => {
          releaseApprove = resolve;
        });
      }
      return json({ code: 200, msg: 'ok', data: null });
    }
    return json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  };

  const state = useRegistration();
  const item = {
    uid: 'u1',
    username: 'n1',
    email: 'n1@example.com',
    status: REGISTER_STATUS.PENDING,
  };

  // 通过确认在途：同步持有互斥锁，且只发出一次真实请求
  state.handleApprove(item);
  const approveOpts = globalThis.__lastDialog;
  assert.equal(typeof approveOpts?.onPositiveClick, 'function', '通过确认应提供真实 onPositiveClick');
  const approving = approveOpts.onPositiveClick();
  assert.equal(state.submitting.value, true, '审批在途必须持有互斥锁');
  assert.deepEqual(postUrls, ['/api/registrations/u1/approve']);

  // 同一确认重复点击：返回 false（对话框保持打开）且不新增请求
  assert.equal(await approveOpts.onPositiveClick(), false, '重复点击必须返回 false');
  // 其它行的通过确认：同样返回 false
  state.handleApprove({ ...item, uid: 'u2' });
  assert.equal(
    await globalThis.__lastDialog.onPositiveClick(),
    false,
    '在途时其它通过确认必须返回 false',
  );
  // 批量通过确认：共享同一把锁
  state.selectedIds.value = ['u1', 'u2'];
  state.handleBatchApprove();
  assert.equal(
    await globalThis.__lastDialog.onPositiveClick(),
    false,
    '在途时批量通过必须返回 false',
  );
  // 打回提交：共享同一把锁
  state.openRejectModal(item);
  state.rejectForm.reason = '资料不全';
  assert.equal(await state.handleRejectSubmit(), false, '在途时打回必须返回 false');
  assert.deepEqual(postUrls, ['/api/registrations/u1/approve'], '互斥期间不得新增任何 POST');

  // 释放后互斥解除：打回可真实提交
  releaseApprove(json({ code: 200, msg: 'ok', data: null }));
  await approving;
  assert.equal(state.submitting.value, false, '完成后必须释放互斥锁');
  await state.handleRejectSubmit();
  assert.deepEqual(
    postUrls,
    ['/api/registrations/u1/approve', '/api/registrations/u1/reject'],
    '互斥释放后打回应真实提交',
  );
  assert.equal(state.submitting.value, false, '打回完成后同样释放互斥锁');
});

await checkAsync('成就：列表/approve/reject/本地附件下载/用户成就增删', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await getAdminAchievements(1, 10, { keyword: '奖', status: 'pending', collegeId: 2 });
  const query = lastQuery();
  assert.equal(lastCall().url.split('?')[0], '/api/admin/achievements');
  assert.equal(query.keyword, '奖');
  assert.equal(query.status, 'pending');
  assert.equal(query.college, '2');

  responder = async () => json({ code: 200, msg: 'ok', data: null });
  await approveAchievement(7);
  assert.equal(lastCall().url, '/api/admin/achievements/7/approve');
  assert.equal(lastCall().init.method, 'POST');

  await rejectAchievement(7, '不符合');
  assert.equal(lastCall().url, '/api/admin/achievements/7/reject');
  assert.deepEqual(lastBody(), { reason: '不符合' });

  // 本地附件：受保护路径 + Bearer，响应为二进制不算业务错误。
  // 返回结构为 { blob, filename }：文件名取自 Content-Disposition，前端据此保留真实扩展名
  responder = async () =>
    new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="proof.pdf"',
      },
    });
  const downloaded = await downloadAchievementApplyFile(7);
  assert.equal(lastCall().url, '/api/admin/achievements/7/file');
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token');
  assert.ok(downloaded.blob.size > 0);
  assert.equal(downloaded.filename, 'proof.pdf');

  // RFC 5987 的 filename* 优先，并按 UTF-8 解码中文名
  responder = async () =>
    new Response(new Uint8Array([1]), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': "attachment; filename*=UTF-8''%E8%AF%81%E6%98%8E.pdf",
      },
    });
  const utf8Named = await downloadAchievementApplyFile(7);
  assert.equal(utf8Named.filename, '证明.pdf');
  assert.ok(utf8Named.blob.size > 0);

  // 后端未给 Content-Disposition 时 filename 为 null，由调用方回退命名
  responder = async () =>
    new Response(new Uint8Array([1, 2]), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  const unnamed = await downloadAchievementApplyFile(7);
  assert.equal(unnamed.filename, null);
  assert.ok(unnamed.blob.size > 0);

  // 业务错误仍必须抛错：绝不能把错误 JSON 当成文件保存为“下载成功”
  responder = async () => json({ code: 500, msg: '附件不存在' });
  await assert.rejects(() => downloadAchievementApplyFile(7), /附件不存在/);

  responder = async () => json({ code: 200, msg: 'ok', data: null });
  await addUserAchievement('u1', { title: 't', content: 'c', proofUrl: 'https://x', achieveTime: 123 });
  assert.equal(lastCall().url, '/api/admin/users/u1/achievements');
  assert.deepEqual(lastBody(), { title: 't', content: 'c', proofUrl: 'https://x', achieveTime: 123 });

  await deleteUserAchievement('u1', 9);
  assert.equal(lastCall().url, '/api/admin/users/u1/achievements/9');
  assert.equal(lastCall().init.method, 'DELETE');
});

await checkAsync('班级师资与导入模板：teachers/tas 路径 + 模板鉴权 Blob', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: [] });
  await getClassTeachers(12);
  assert.equal(lastCall().url, '/api/classes/12/teachers');
  await getClassTas(12);
  assert.equal(lastCall().url, '/api/classes/12/tas');

  responder = async () =>
    new Response(new Uint8Array([0x50, 0x4b]), { status: 200, headers: { 'Content-Type': 'application/zip' } });
  const template = await downloadUserImportTemplate();
  assert.equal(lastCall().url, '/api/users/import/template');
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token');
  assert.ok(template.size > 0);
});

await checkAsync('系统配置保存：PUT /api/admin/config 原样提交 registerMode', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: null });
  await saveAdminSystemConfig({
    websiteName: 'X', allowRegister: true, registerMode: 'OPEN', submissionInterval: 5,
  });
  assert.equal(lastCall().url, '/api/admin/config');
  assert.equal(lastCall().init.method, 'PUT');
  assert.equal(lastBody().registerMode, 'OPEN');
});

// --------------------------------------------------
// B. 纯映射
// --------------------------------------------------
check('用户 VO -> 行：保留全部真实角色，主角色取最高', () => {
  const item = toUserItem({
    uid: 'u1', username: 'n1', realname: null, avatar: null,
    collegeId: 1, college: 'c', grade: '2022', classId: 2, majorClass: 'm',
    status: 1, roles: ['student', 'teacher', 'admin'],
  });
  assert.deepEqual(item.roles, ['student', 'teacher', 'admin']);
  assert.equal(item.primaryRole, 'ADMIN');
  assert.equal(item.status, 1);
  assert.equal(item.majorClass, 'm');
});

check('权限：从多角色中挑出可管理角色用于编辑回显', () => {
  assert.equal(pickManageableRole(['student', 'ta']), 'TA');
  assert.equal(pickManageableRole(['student', 'teacher']), 'TEACHER');
  assert.equal(pickManageableRole(['admin', 'student']), 'ADMIN');
  assert.equal(pickManageableRole(['student']), null);
  assert.equal(pickManageableRole(null), null);
});

check('注册 VO -> 行：状态为整数（0/1/2）而非字符串假设', () => {
  const item = toRegistrationItem({
    uid: 'u1', username: 'n1', email: 'e', collegeId: 1, collegeName: 'c',
    classId: 2, className: 'cls', grade: '2022', qq: '1', status: 2,
    replyInfo: 'no', submitTime: 456,
  });
  assert.equal(item.status, REGISTER_STATUS.REJECTED);
  assert.equal(item.major, 'cls');
  assert.equal(item.college, 'c');
  assert.equal(item.submitTime, 456);
});

check('成就：外部附件仅 http(s)，本地 key/受保护路径不得当链接', () => {
  assert.equal(isExternalFile('https://x/y.png'), true);
  assert.equal(isExternalFile('http://x/y.png'), true);
  assert.equal(isExternalFile('/api/admin/achievements/7/file'), false);
  assert.equal(isExternalFile('local/abc.png'), false);
  assert.equal(isExternalFile(''), false);
  assert.equal(isExternalFile(null), false);

  const row = toAchievementApplication({
    id: 7, uid: 'u1', username: 'n1', title: 't', status: 'pending',
    description: 'd', fileUrl: '/api/admin/achievements/7/file', submitTime: 1,
  });
  assert.equal(row.description, 'd');
  assert.equal(row.fileUrl, '/api/admin/achievements/7/file');
});

check('系统配置：toSystemConfig 原样保留后端枚举，不做 OPEN->PUBLIC 隐式转换', () => {
  assert.deepEqual([...REGISTER_MODES], ['OPEN', 'EMAIL_SUFFIX', 'INVITE_CODE']);
  const open = toSystemConfig({ registerMode: 'OPEN', allowRegister: true });
  assert.equal(open.registerMode, 'OPEN');
  assert.equal(open.smtpPassword, '');
  const invite = toSystemConfig({ registerMode: 'INVITE_CODE' });
  assert.equal(invite.registerMode, 'INVITE_CODE');
});

check('系统配置：toSaveRequest 留空 smtpPassword 时整键省略（保留后端旧值）', () => {
  const blank = toSaveRequest({ ...toSystemConfig({ registerMode: 'OPEN' }), smtpPassword: '   ' });
  assert.ok(!('smtpPassword' in blank), '留空必须省略 smtpPassword');
  const filled = toSaveRequest({ ...toSystemConfig({ registerMode: 'OPEN' }), smtpPassword: ' secret ' });
  assert.equal(filled.smtpPassword, 'secret');
});

// --------------------------------------------------
// C. 组合式行为（真实 composable）
// --------------------------------------------------
async function checkSystemConfigRoundtrip(mode) {
  const configCalls = [];
  const start = calls.length;
  responder = async (url, init) => {
    const target = String(url);
    if (target.startsWith('/api/admin/config') && (!init || init.method === 'GET')) {
      configCalls.push('GET');
      return json({
        code: 200,
        msg: 'ok',
        data: {
          websiteName: 'HnieOJ', logoUrl: '', icpCode: '', allowRegister: true,
          registerMode: mode, allowedEmailSuffixes: [], smtpHost: '', smtpPort: 465,
          smtpEmail: '', smtpNickname: '', submissionInterval: 5, gmtModified: null,
        },
      });
    }
    if (target === '/api/admin/config' && init?.method === 'PUT') {
      configCalls.push('PUT');
      return json({ code: 200, msg: 'ok', data: null });
    }
    throw new Error(`unexpected fetch: ${target}`);
  };

  const state = useSystemConfig();
  await state.fetchConfig();
  assert.equal(state.config.registerMode, mode, '读取必须原样保留后端枚举');

  state.config.smtpPassword = '';
  await state.saveConfig();

  const putCall = calls
    .slice(start)
    .find((call) => call.url === '/api/admin/config' && call.init?.method === 'PUT');
  assert.ok(putCall, '必须发起 PUT /api/admin/config');
  const body = JSON.parse(putCall.init.body);
  assert.equal(body.registerMode, mode, '保存必须原样提交后端枚举');
  assert.ok(!('smtpPassword' in body), '未填写 smtpPassword 时必须省略');
  assert.equal(configCalls.filter((x) => x === 'GET').length >= 2, true, '保存后必须重新读取配置');
}

await checkAsync('R8 回归：OPEN 读取 -> 保存仍为 OPEN，且 smtpPassword 省略', async () => {
  await checkSystemConfigRoundtrip('OPEN');
});

await checkAsync('R8 回归：INVITE_CODE 读取 -> 保存仍为 INVITE_CODE（不转换）', async () => {
  await checkSystemConfigRoundtrip('INVITE_CODE');
});

await checkAsync('系统配置：非法 registerMode 不发 PUT 并显式报错', async () => {
  let putCount = 0;
  let errorMessage = '';
  globalThis.__msg.error = (msg) => {
    errorMessage = String(msg);
  };
  responder = async (url, init) => {
    if (init?.method === 'PUT') {
      putCount += 1;
      return json({ code: 200, msg: 'ok', data: null });
    }
    return json({ code: 200, msg: 'ok', data: { registerMode: 'OPEN', allowRegister: true } });
  };
  const state = useSystemConfig();
  await state.fetchConfig();
  state.config.registerMode = 'PUBLIC';
  await state.saveConfig();
  assert.equal(putCount, 0, '非法枚举不得发起保存');
  assert.ok(errorMessage.includes('registerMode'), '必须显式提示非法 registerMode');
  globalThis.__msg.error = () => {};
});

await checkAsync('用户表单：班级切换作废在途 teachers/tas，最终为最新班级师资', async () => {
  const deferred = [];
  const staffUrls = [];
  responder = async (url) => {
    const target = String(url);
    if (target.includes('/classes/111/')) {
      staffUrls.push(target);
      return new Promise((resolve) => deferred.push(resolve));
    }
    staffUrls.push(target);
    if (target.includes('/classes/222/teachers')) {
      return json({ code: 200, msg: 'ok', data: [{ uid: 't2', name: 'T2' }] });
    }
    return json({ code: 200, msg: 'ok', data: [{ uid: 'a2', name: 'A2' }] });
  };

  const state = useUserManage();
  const pendingOld = state.handleAddClassChange(111);
  const pendingNew = state.handleAddClassChange(222);
  await pendingNew;
  // 旧班级响应迟到，必须被丢弃
  deferred.forEach((resolve) => resolve(json({ code: 200, msg: 'ok', data: [{ uid: 'old', name: 'OLD' }] })));
  await pendingOld;

  assert.deepEqual(state.classTeachers.value.map((t) => t.uid), ['t2']);
  assert.deepEqual(state.classTas.value.map((t) => t.uid), ['a2']);
  assert.ok(
    staffUrls.some((u) => u.includes('/classes/222/teachers')) &&
      staffUrls.some((u) => u.includes('/classes/222/tas')),
    '必须真实调用同一班级的 teachers 与 tas',
  );
  assert.ok(
    staffUrls.some((u) => u.includes('/classes/111/teachers')) &&
      staffUrls.some((u) => u.includes('/classes/111/tas')),
    '旧班级也需 teachers/tas 成对调用',
  );
});

await checkAsync('用户详情：按 uid 真实读取 /api/user/users/{uid}', async () => {
  responder = async (url) => {
    assert.equal(String(url), '/api/user/users/u1');
    return json({ code: 200, msg: 'ok', data: { uid: 'u1', username: 'n1', roles: ['student', 'teacher'] } });
  };
  const state = useUserManage();
  await state.openDetailModal({ uid: 'u1' });
  assert.equal(state.detail.value?.uid, 'u1');
  assert.deepEqual(state.detail.value?.roles, ['student', 'teacher']);
});

// --------------------------------------------------
// D. 源码级约束
// --------------------------------------------------
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');

check('Service.vue：handleTabChange/refreshAll 返回真实 Promise', () => {
  const source = read('src/views/admin/SystemManage/Service.vue');
  assert.ok(source.includes('return fetchNodes()'), 'handleTabChange 必须返回 fetchNodes Promise');
  assert.ok(source.includes('return fetchTokens()'), 'handleTabChange 必须返回 fetchTokens Promise');
  assert.ok(source.includes('return fetchRemoteAccounts()'), 'handleTabChange 必须返回 fetchRemoteAccounts Promise');
  assert.ok(
    source.includes(
      'const refreshAll = (): Promise<JudgeReadOutcome> => handleTabChange(activeTab.value)',
    ),
    'refreshAll 必须返回 handleTabChange 的回读结果',
  );
});

check('判题节点组合式：凭据不写入 localStorage', () => {
  const source = read('src/composables/admin/useJudgeNodes.ts');
  assert.ok(!source.includes('localStorage'), '凭据不得写本地存储');
  const service = read('src/views/admin/SystemManage/Service.vue');
  assert.ok(!service.includes('localStorage'), 'Service.vue 不得写本地存储凭据');
});

check('本批无 mock / Math.random / 模拟 delay', () => {
  const files = [
    'src/composables/admin/useUserManage.ts',
    'src/composables/admin/useRegistration.ts',
    'src/composables/admin/usePermissionManage.ts',
    'src/composables/admin/useAchievementManage.ts',
    'src/composables/admin/useUserChange.ts',
    'src/composables/admin/useSystemConfig.ts',
    'src/views/admin/UserManage/UserList.vue',
    'src/views/admin/UserManage/Registration.vue',
    'src/views/admin/UserManage/Permission.vue',
    'src/views/admin/UserManage/Achievement.vue',
    'src/views/admin/UserManage/Change.vue',
    'src/views/admin/SystemManage/Config.vue',
    'src/views/admin/SystemManage/Service.vue',
  ];
  for (const file of files) {
    const source = read(file);
    assert.ok(!source.includes('Math.random'), `${file} 不应包含 Math.random`);
    assert.ok(!source.includes('setTimeout'), `${file} 不应包含模拟 delay 的 setTimeout`);
    assert.ok(!source.includes('模拟数据'), `${file} 不应包含模拟数据`);
    assert.ok(!source.includes('TODO: 调用'), `${file} 不应残留未接线的 TODO`);
  }
});

check('接线明确：用户导入/注册名单已接真实 API，变更页/比赛成就已接真实 API', () => {
  const userList = read('src/views/admin/UserManage/UserList.vue');
  assert.ok(userList.includes('@click="handleImport"'), '用户导入必须接真实 handleImport 提交入口');
  assert.ok(userList.includes('handleDownloadTemplate'), '用户导入模板下载必须保留');
  assert.ok(!userList.includes('n-upload disabled'), '用户导入上传不得再整体禁用');
  assert.ok(
    !userList.includes('后端无上传接口') && !userList.includes('暂不可用'),
    '用户导入不得再声称后端缺接口/暂不可用',
  );

  const registration = read('src/views/admin/UserManage/Registration.vue');
  assert.ok(
    registration.includes('上传名单自动通过') && registration.includes('@click="handleImport"'),
    '注册名单必须保留真实导入入口并接 handleImport 提交',
  );
  assert.ok(!registration.includes('n-upload disabled'), '注册名单上传不得再整体禁用');
  assert.ok(
    !registration.includes('后端未提供注册名单') && !registration.includes('暂不可用'),
    '注册名单不得再声称后端缺接口/暂不可用',
  );
  assert.ok(!registration.includes('下载模板'), '注册名单没有模板接口，不得提供假模板');

  const change = read('src/views/admin/UserManage/Change.vue');
  assert.ok(!change.includes('暂未开放'), '变更页不得再保留旧占位文案');
  assert.ok(change.includes('useUserChange'), '变更页必须接真实 useUserChange');
  assert.ok(change.includes('openApprove') && change.includes('openReject'), '变更页必须提供真实通过/驳回入口');
  assert.ok(change.includes('ProfileChangeVo'), '变更页行数据必须使用申请 VO（行 key 为申请 id）');

  const contestAchievement = read('src/views/admin/ContestManage/Achievement.vue');
  assert.ok(!contestAchievement.includes('showEasterEgg'), '重复入口不得保留无关彩蛋');
  assert.ok(!contestAchievement.includes('暂未开放'), '比赛成就页不得再保留旧占位文案');
  assert.ok(contestAchievement.includes('getUserAchievements'), '比赛成就页必须接真实 getUserAchievements');
  assert.ok(contestAchievement.includes('addUserAchievement'), '比赛成就页必须接真实 addUserAchievement');
  assert.ok(contestAchievement.includes('deleteUserAchievement'), '比赛成就页必须接真实 deleteUserAchievement');
  assert.ok(contestAchievement.includes('AdminUserAchievement'), '比赛成就页必须保留成就申请审核入口');
});

check('页面真实入口：详情(uid) / 查验(check) / 权限搜索(admin search) / teachers+tas', () => {
  const userList = read('src/views/admin/UserManage/UserList.vue');
  assert.ok(userList.includes('openDetailModal'), '用户列表需有按 uid 详情入口');
  assert.ok(userList.includes('handleCheckUser'), '用户列表需有 /api/user/check 查验入口');

  const permission = read('src/views/admin/UserManage/Permission.vue');
  assert.ok(permission.includes('handleSearch'), '权限页需实际调用 /api/admin/users/search');

  const manage = read('src/composables/admin/useUserManage.ts');
  assert.ok(manage.includes('getUserDetail'), 'useUserManage 必须调用 getUserDetail');
  assert.ok(
    manage.includes('getClassTeachers') && manage.includes('getClassTas'),
    '用户表单必须成对调用 teachers 与 tas',
  );
});

check('R1 回归：UserList/Achievement 服务端分页表格启用 remote 模式', () => {
  for (const file of [
    'src/views/admin/UserManage/UserList.vue',
    'src/views/admin/UserManage/Achievement.vue',
  ]) {
    const table = read(file).match(/<n-data-table[\s\S]*?\/>/)[0];
    assert.match(
      table,
      /\bremote(?:\s|=|>)/,
      `${file} 服务端分页表格必须启用 remote，避免只渲染当前页条数`,
    );
  }
});

await checkAsync('R1 回归：服务端分页 total 大于 pageSize 时完整反映总数', async () => {
  const state = useUserManage();
  state.pagination.pageSize = 2;
  responder = async () =>
    json({
      code: 200,
      msg: 'ok',
      data: {
        list: [
          { uid: 'u1', username: 'n1' },
          { uid: 'u2', username: 'n2' },
        ],
        total: 40,
      },
    });
  await state.fetchUsers();
  assert.equal(state.pagination.itemCount, 40, '分页总数必须取后端 total 而非当前页长度');
  assert.equal(state.userList.value.length, 2);
});

await checkAsync('R2 回归：学院变更作废在途班级请求（筛选/编辑/新增）', async () => {
  for (const kind of ['Filter', 'Edit', 'Add']) {
    const state = useUserManage();
    const form =
      kind === 'Filter' ? state.filters : kind === 'Edit' ? state.editForm : state.addUserForm;
    form.collegeId = 1;
    form.grade = '2022';
    let resolveOld;
    responder = async (url) =>
      String(url).includes('/classes')
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : json({ code: 200, msg: 'ok', data: [] });
    const pending = state[`handle${kind}GradeChange`]('2022');
    form.collegeId = 2;
    await state[`handle${kind}CollegeChange`](2);
    resolveOld(json({ code: 200, msg: 'ok', data: [{ id: 99, name: 'OLD COLLEGE CLASS' }] }));
    await pending;
    assert.deepEqual(
      state[`${kind.toLowerCase()}ClassOptions`].value,
      [],
      `${kind} 旧学院/旧年级的班级响应必须被丢弃`,
    );
  }
});

await checkAsync('R4 回归：权限搜索点击搜索回到第 1 页，翻页保留请求页', async () => {
  const pages = [];
  responder = async (url) => {
    pages.push(new URL(String(url), 'http://localhost').searchParams.get('page'));
    return json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  };
  const state = usePermissionManage();
  state.searchQuery.value = '张三';
  state.searchPagination.page = 3;
  await state.handleSearch();
  assert.equal(state.searchPagination.page, 1, '新搜索必须从第 1 页开始');
  state.searchPagination.onChange(2);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.searchPagination.page, 2, '翻页必须保留用户请求的页码');
  assert.deepEqual(pages, ['1', '2']);
});

check('R5 回归：用户可见文案不含实现细节术语', () => {
  const files = [
    'src/views/admin/UserManage/UserList.vue',
    'src/views/admin/UserManage/Achievement.vue',
    'src/views/admin/UserManage/Permission.vue',
    'src/views/admin/UserManage/Registration.vue',
    'src/views/admin/UserManage/components/ClassStaffReadonly.vue',
    'src/views/admin/SystemManage/Config.vue',
    'src/views/admin/ContestManage/Achievement.vue',
  ];
  for (const file of files) {
    const source = read(file);
    assert.ok(!source.includes('Bearer'), `${file} 不应出现 Bearer`);
    assert.ok(!source.includes('RegisterRequest'), `${file} 不应出现 RegisterRequest`);
    assert.ok(!source.includes('本批次'), `${file} 不应出现 本批次`);
  }
});

console.log(`\n${passed} admin-users checks passed`);
