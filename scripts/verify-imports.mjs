// 本批（用户与注册名单 Excel 导入）验收：
// - POST /api/users/import 与 POST /api/registrations/import 的真实 multipart 契约：
//   路径、字段名 file、文件字节与文件名、Bearer 鉴权、由 fetch 生成带 boundary 的 Content-Type
// - 两个 composable 的真实行为：空选择/空文件/错误后缀拒绝、正常、部分失败、全失败、
//   HTTP/网络失败保留文件可重试、在途重复提交锁、关闭清理敏感结果、成功数>0 刷新真实列表
// - 页面接线补充检查：真实上传入口、正确表头/1000 行说明、注册无假模板、敏感值不落存储/日志
// 运行：node scripts/verify-imports.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

import { importRegistrations, importUsers } from '../src/utils/api.ts';

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

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf-8');

// ---- 可观测 fetch / localStorage / message / console ----
const storage = new Map([['token', 'real-token']]);
const storageWrites = [];
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    storageWrites.push({ key, value: String(value) });
    storage.set(key, String(value));
  },
  removeItem: (key) => {
    storageWrites.push({ key, value: null });
    storage.delete(key);
  },
};

const messages = [];
globalThis.__msg = {
  success: (text) => messages.push({ type: 'success', text: String(text) }),
  error: (text) => messages.push({ type: 'error', text: String(text) }),
  warning: (text) => messages.push({ type: 'warning', text: String(text) }),
  info: (text) => messages.push({ type: 'info', text: String(text) }),
};
// 记录最后一次对话框参数，供注册导入与审批互斥用例真实调用 onPositiveClick
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

const logged = [];
for (const level of ['log', 'warn', 'error', 'info', 'debug']) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    logged.push(args.map((arg) => String(arg)).join(' '));
    original(...args);
  };
}

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
function lastMessage(type) {
  const matches = messages.filter((item) => !type || item.type === type);
  return matches[matches.length - 1];
}
function resetObservations() {
  calls.length = 0;
  messages.length = 0;
  logged.length = 0;
}
/** 真实列表读取（带分页 query），不含 /import 上传本身 */
function listReads(base) {
  return calls.filter((call) => call.url === base || call.url.startsWith(`${base}?`));
}

const XLSX_BYTES = [0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00];
const XLS_BYTES = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function makeFile(name, bytes = XLSX_BYTES, type = XLSX_MIME) {
  return new File([new Uint8Array(bytes)], name, { type });
}

/** 取出 multipart 请求中的 file 字段，断言文件名与字节原样发送 */
async function sentFile(init, field = 'file') {
  assert.ok(init.body instanceof FormData, '导入请求体必须是 FormData');
  const file = init.body.get(field);
  assert.ok(file instanceof File, `FormData 必须包含名为 ${field} 的文件`);
  return { name: file.name, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
}

/** 不手动设 Content-Type；由 fetch 生成带 boundary 的 multipart 头 */
function assertMultipart(init) {
  assert.equal(init.headers.get('Content-Type'), null, 'FormData 不得手动设置 Content-Type');
  const request = new Request('http://localhost/upload', {
    method: init.method ?? 'POST',
    headers: init.headers,
    body: init.body,
  });
  const contentType = request.headers.get('Content-Type') ?? '';
  assert.match(
    contentType,
    /^multipart\/form-data; boundary=.+/,
    'fetch 必须为 FormData 生成带 boundary 的 multipart Content-Type',
  );
}

// ---- 桩换 naive-ui，供组合式模块在 Node 下导入 ----
const naiveStub =
  'data:text/javascript,' +
  encodeURIComponent(
    'export const useMessage = () => globalThis.__msg; export const useDialog = () => globalThis.__dialog;',
  );
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

const { useUserManage } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useUserManage.ts'))
);
const { useRegistration } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useRegistration.ts'))
);

// --------------------------------------------------
// A. API wrapper 真实 multipart 契约
// --------------------------------------------------
await checkAsync('用户导入 wrapper：POST /api/users/import，file 字节/Bearer/boundary 正确', async () => {
  const payload = {
    successCount: 1,
    failedCount: 1,
    createdUsers: [{ uid: 'u1', initialPassword: 'initPassAlpha' }],
    failures: [{ rowNo: 3, uid: 'u2', reason: 'uid 已存在' }],
  };
  responder = async () => json({ code: 200, msg: 'ok', data: payload });
  resetObservations();

  const result = await importUsers(makeFile('users.xlsx'));

  assert.equal(lastCall().url, '/api/users/import');
  assert.equal(lastCall().init.method, 'POST');
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token');
  assertMultipart(lastCall().init);
  const sent = await sentFile(lastCall().init);
  assert.equal(sent.name, 'users.xlsx');
  assert.deepEqual(sent.bytes, XLSX_BYTES, 'file 字节必须原样发送');
  assert.deepEqual(result, payload, '强类型结果必须与后端 VO 字段一致');
});

await checkAsync('注册导入 wrapper：POST /api/registrations/import，file 字节/Bearer/boundary 正确', async () => {
  const payload = {
    successCount: 2,
    failedCount: 1,
    successUids: ['u1', 'u2'],
    failures: [{ rowNo: 4, uid: 'u3', reason: '邮箱格式错误' }],
  };
  responder = async () => json({ code: 200, msg: 'ok', data: payload });
  resetObservations();

  const result = await importRegistrations(makeFile('registrations.xls', XLS_BYTES, 'application/vnd.ms-excel'));

  assert.equal(lastCall().url, '/api/registrations/import');
  assert.equal(lastCall().init.method, 'POST');
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token');
  assertMultipart(lastCall().init);
  const sent = await sentFile(lastCall().init);
  assert.equal(sent.name, 'registrations.xls');
  assert.deepEqual(sent.bytes, XLS_BYTES, 'file 字节必须原样发送');
  assert.deepEqual(result, payload, '强类型结果必须与后端 VO 字段一致');
});

await checkAsync('两个 wrapper 不吞后端业务错误与 HTTP 错误', async () => {
  responder = async () => json({ code: 400, msg: 'Excel 缺少表头：uid' });
  await assert.rejects(() => importUsers(makeFile('users.xlsx')), /Excel 缺少表头：uid/);

  responder = async () => json({ code: 400, msg: '单次最多导入 1000 行' });
  await assert.rejects(() => importRegistrations(makeFile('registrations.xlsx')), /单次最多导入 1000 行/);

  responder = async () => json({ code: 500, msg: '导入服务暂不可用' }, 503);
  await assert.rejects(() => importUsers(makeFile('users.xlsx')), /导入服务暂不可用/);
});

// --------------------------------------------------
// B. useUserManage 导入行为
// --------------------------------------------------
await checkAsync('用户导入：空选择/空文件/错误后缀拒绝且不发请求，xls 与 xlsx 均接受', async () => {
  const state = useUserManage();
  state.openImportModal();
  resetObservations();

  await state.handleImport();
  assert.equal(calls.length, 0, '空选择不得发请求');
  assert.equal(lastMessage('warning')?.text, '请先选择要导入的 Excel 文件');

  assert.equal(state.handleImportFileChange(null), false);
  assert.equal(state.importFile.value, null);

  assert.equal(
    state.handleImportFileChange(makeFile('users.txt', XLSX_BYTES, 'text/plain')),
    false,
    '错误后缀必须拒绝',
  );
  assert.equal(state.importFile.value, null);
  assert.match(lastMessage('warning').text, /仅支持 \.xls \/ \.xlsx/);

  assert.equal(state.handleImportFileChange(makeFile('empty.xlsx', [])), false, '空文件必须拒绝');
  assert.equal(state.importFile.value, null);
  assert.match(lastMessage('warning').text, /文件内容为空/);

  assert.equal(state.handleImportFileChange(makeFile('users.xlsx')), true);
  assert.equal(state.importFile.value?.name, 'users.xlsx');
  assert.equal(
    state.handleImportFileChange(makeFile('users.xls', XLS_BYTES, 'application/vnd.ms-excel')),
    true,
  );
  assert.equal(state.importFile.value?.name, 'users.xls');
  assert.equal(calls.length, 0, '仅选择文件不得发请求');
  assert.equal(state.importResult.value, null);
});

await checkAsync('用户导入：全成功真实计数与初始密码，成功数>0 刷新列表并清空原文件', async () => {
  const state = useUserManage();
  state.openImportModal();
  state.handleImportFileChange(makeFile('users.xlsx'));
  resetObservations();
  responder = async (url) =>
    url === '/api/users/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: {
            successCount: 2,
            failedCount: 0,
            createdUsers: [
              { uid: 'u1', initialPassword: 'initPassAlpha' },
              { uid: 'u2', initialPassword: 'initPassBeta' },
            ],
            failures: [],
          },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });

  await state.handleImport();

  assert.equal(state.submitting.value, false);
  assert.equal(state.importResult.value?.successCount, 2);
  assert.equal(state.importResult.value?.failedCount, 0);
  assert.deepEqual(state.importResult.value?.createdUsers, [
    { uid: 'u1', initialPassword: 'initPassAlpha' },
    { uid: 'u2', initialPassword: 'initPassBeta' },
  ]);
  assert.equal(state.importFile.value, null, '返回结果后必须清空原文件，避免整份名单重复导入');
  assert.equal(lastMessage('success').text, '导入成功 2 条');
  assert.equal(listReads('/api/user/users').length, 1, '成功数>0 必须刷新真实列表');

  const persisted = JSON.stringify([...storage.entries()]) + JSON.stringify(storageWrites);
  assert.ok(
    !persisted.includes('initPassAlpha') && !persisted.includes('initPassBeta'),
    '初始密码不得写入本地存储',
  );
  assert.ok(
    !logged.some((line) => line.includes('initPassAlpha') || line.includes('initPassBeta')),
    '初始密码不得写入日志',
  );
});

await checkAsync('用户导入：部分成功透传失败行 UID/原因，提示只修正失败行并清空原文件', async () => {
  const state = useUserManage();
  state.openImportModal();
  state.handleImportFileChange(makeFile('users.xlsx'));
  resetObservations();
  responder = async (url) =>
    url === '/api/users/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: {
            successCount: 1,
            failedCount: 1,
            createdUsers: [{ uid: 'u1', initialPassword: 'initPassAlpha' }],
            failures: [{ rowNo: 3, uid: 'u2', reason: 'uid 已存在' }],
          },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });

  await state.handleImport();

  assert.equal(state.importResult.value?.successCount, 1);
  assert.equal(state.importResult.value?.failedCount, 1);
  assert.deepEqual(state.importResult.value?.failures, [
    { rowNo: 3, uid: 'u2', reason: 'uid 已存在' },
  ]);
  const warning = lastMessage('warning');
  assert.match(warning.text, /成功 1 条，失败 1 条/);
  assert.match(warning.text, /只修正失败行后再上传/);
  assert.equal(state.importFile.value, null, '部分成功同样不得保留原文件误导重复导入');
  assert.equal(listReads('/api/user/users').length, 1, '成功数>0 必须刷新真实列表');
});

await checkAsync('用户导入：全失败显示真实计数且不刷新列表', async () => {
  const state = useUserManage();
  state.openImportModal();
  state.handleImportFileChange(makeFile('users.xlsx'));
  resetObservations();
  responder = async (url) =>
    url === '/api/users/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: {
            successCount: 0,
            failedCount: 2,
            createdUsers: [],
            failures: [
              { rowNo: 2, uid: 'u1', reason: 'uid 不能为空' },
              { rowNo: 3, uid: 'u2', reason: 'collegeId 必须是数字' },
            ],
          },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });

  await state.handleImport();

  assert.equal(state.importResult.value?.successCount, 0);
  assert.equal(state.importResult.value?.failedCount, 2);
  assert.equal(state.importResult.value?.failures.length, 2);
  assert.match(lastMessage('error').text, /成功 0 条，失败 2 条/);
  assert.equal(state.importFile.value, null);
  assert.equal(listReads('/api/user/users').length, 0, '成功数为 0 不得刷新列表');
});

await checkAsync('用户导入：HTTP/网络失败保留文件、不显示成功，可重试成功', async () => {
  const state = useUserManage();
  state.openImportModal();
  const file = makeFile('users.xlsx');
  state.handleImportFileChange(file);
  resetObservations();

  responder = async () => json({ code: 500, msg: '导入服务暂不可用' }, 503);
  await state.handleImport();
  assert.equal(state.importFile.value, file, 'HTTP 失败必须保留文件以支持重试');
  assert.equal(state.importResult.value, null, '失败不得显示任何成功结果');
  assert.equal(lastMessage('error').text, '导入服务暂不可用');

  responder = async () => {
    throw new Error('network down');
  };
  await state.handleImport();
  assert.equal(state.importFile.value, file, '网络失败同样保留文件');
  assert.equal(state.importResult.value, null);
  assert.match(lastMessage('error').text, /network down/);

  responder = async (url) =>
    url === '/api/users/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: {
            successCount: 1,
            failedCount: 0,
            createdUsers: [{ uid: 'u1', initialPassword: 'initPassAlpha' }],
            failures: [],
          },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await state.handleImport();
  assert.equal(state.importResult.value?.successCount, 1, '重试成功必须记录真实结果');
  assert.equal(state.importFile.value, null);
  assert.equal(state.submitting.value, false);
});

await checkAsync('用户导入：在途重复点击只发一次请求，且不得换文件/关弹窗', async () => {
  const state = useUserManage();
  state.openImportModal();
  const file = makeFile('users.xlsx');
  state.handleImportFileChange(file);
  resetObservations();

  const postUrls = [];
  let release;
  responder = (url) => {
    if (url === '/api/users/import') {
      postUrls.push(url);
      return new Promise((resolve) => {
        release = resolve;
      });
    }
    return json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  };

  const importing = state.handleImport();
  assert.equal(state.submitting.value, true, '导入在途必须持有提交锁');
  await state.handleImport();
  assert.deepEqual(postUrls, ['/api/users/import'], '在途重复点击不得新增请求');
  assert.equal(state.handleImportFileChange(makeFile('other.xlsx')), false, '在途不得更换文件');
  assert.equal(state.importFile.value, file);
  assert.equal(state.closeImportModal(), false, '在途不得关闭弹窗');
  assert.equal(state.showImportModal.value, true);

  release(
    json({
      code: 200,
      msg: 'ok',
      data: {
        successCount: 1,
        failedCount: 0,
        createdUsers: [{ uid: 'u1', initialPassword: 'initPassAlpha' }],
        failures: [],
      },
    }),
  );
  await importing;
  assert.equal(state.submitting.value, false, '完成后必须释放提交锁');
  assert.equal(state.importResult.value?.successCount, 1);
});

await checkAsync('用户导入：关闭清除初始密码结果，重新打开无旧文件/旧结果', async () => {
  const state = useUserManage();
  state.openImportModal();
  state.handleImportFileChange(makeFile('users.xlsx'));
  responder = async (url) =>
    url === '/api/users/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: {
            successCount: 1,
            failedCount: 0,
            createdUsers: [{ uid: 'u1', initialPassword: 'initPassAlpha' }],
            failures: [],
          },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await state.handleImport();
  assert.equal(state.importResult.value?.createdUsers[0]?.initialPassword, 'initPassAlpha');

  // 选择下一批文件不得提前清掉上一批的初始密码（只在下一次导入或关闭时替换）
  const nextFile = makeFile('users-next.xlsx');
  assert.equal(state.handleImportFileChange(nextFile), true);
  assert.equal(state.importFile.value, nextFile);
  assert.equal(
    state.importResult.value?.createdUsers[0]?.initialPassword,
    'initPassAlpha',
    '换文件不得丢失尚未记录的初始密码',
  );

  assert.equal(state.closeImportModal(), true);
  assert.equal(state.showImportModal.value, false);
  assert.equal(state.importResult.value, null, '关闭后必须清除初始密码结果');
  assert.equal(state.importFile.value, null);
  assert.ok(
    !logged.some((line) => line.includes('initPassAlpha')),
    '关闭后不得把初始密码写入日志',
  );

  // 非按钮关闭（右上角/Esc）由 after-leave 兜底清理
  state.importFile.value = makeFile('stale.xlsx');
  state.importResult.value = {
    successCount: 1,
    failedCount: 0,
    createdUsers: [{ uid: 'u9', initialPassword: 'initPassGamma' }],
    failures: [],
  };
  state.handleImportModalAfterLeave();
  assert.equal(state.importResult.value, null, 'after-leave 必须兜底清理结果');
  assert.equal(state.importFile.value, null, 'after-leave 必须兜底清理文件');

  // 新会话：重新打开必须清空旧文件/旧结果
  state.importFile.value = makeFile('stale.xlsx');
  state.importResult.value = {
    successCount: 1,
    failedCount: 0,
    createdUsers: [{ uid: 'u9', initialPassword: 'initPassGamma' }],
    failures: [],
  };
  state.openImportModal();
  assert.equal(state.importResult.value, null, '新打开会话不得沿用旧结果');
  assert.equal(state.importFile.value, null, '新打开会话不得沿用旧文件');
});

// --------------------------------------------------
// C. useRegistration 导入行为
// --------------------------------------------------
await checkAsync('注册导入：空选择/空文件/错误后缀拒绝且不发请求', async () => {
  const state = useRegistration();
  state.openImportModal();
  resetObservations();

  await state.handleImport();
  assert.equal(calls.length, 0, '空选择不得发请求');
  assert.equal(lastMessage('warning')?.text, '请先选择要导入的 Excel 名单文件');

  assert.equal(state.handleImportFileChange(null), false);
  assert.equal(state.handleImportFileChange(makeFile('registrations.txt', XLSX_BYTES, 'text/plain')), false);
  assert.equal(state.importFile.value, null);
  assert.equal(state.handleImportFileChange(makeFile('registrations.xlsx', [])), false);
  assert.equal(state.importFile.value, null);
  assert.equal(state.handleImportFileChange(makeFile('registrations.xlsx')), true);
  assert.equal(state.importFile.value?.name, 'registrations.xlsx');
  assert.equal(calls.length, 0, '仅选择文件不得发请求');
});

await checkAsync('注册导入：全成功展示成功 UID，成功数>0 刷新列表并清空原文件', async () => {
  const state = useRegistration();
  state.openImportModal();
  state.handleImportFileChange(makeFile('registrations.xls', XLS_BYTES, 'application/vnd.ms-excel'));
  resetObservations();
  responder = async (url) =>
    url === '/api/registrations/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: { successCount: 2, failedCount: 0, successUids: ['u1', 'u2'], failures: [] },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });

  await state.handleImport();

  assert.equal(state.importResult.value?.successCount, 2);
  assert.deepEqual(state.importResult.value?.successUids, ['u1', 'u2'], '必须展示成功 UID');
  assert.equal(state.importFile.value, null, '返回结果后必须清空原文件，避免整份名单重复导入');
  assert.equal(lastMessage('success').text, '导入成功 2 条');
  assert.equal(listReads('/api/registrations').length, 1, '成功数>0 必须刷新真实列表');
});

await checkAsync('注册导入：部分成功透传失败行并提示只修正失败行，全失败显示真实计数', async () => {
  const partial = useRegistration();
  partial.openImportModal();
  partial.handleImportFileChange(makeFile('registrations.xlsx'));
  resetObservations();
  responder = async (url) =>
    url === '/api/registrations/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: {
            successCount: 2,
            failedCount: 1,
            successUids: ['u1', 'u2'],
            failures: [{ rowNo: 4, uid: 'u3', reason: 'uid 已存在' }],
          },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await partial.handleImport();
  assert.deepEqual(partial.importResult.value?.successUids, ['u1', 'u2']);
  assert.deepEqual(partial.importResult.value?.failures, [
    { rowNo: 4, uid: 'u3', reason: 'uid 已存在' },
  ]);
  assert.match(lastMessage('warning').text, /成功 2 条，失败 1 条/);
  assert.match(lastMessage('warning').text, /只修正失败行后再上传/);
  assert.equal(partial.importFile.value, null);
  assert.equal(listReads('/api/registrations').length, 1);

  const allFailed = useRegistration();
  allFailed.openImportModal();
  allFailed.handleImportFileChange(makeFile('registrations.xlsx'));
  resetObservations();
  responder = async (url) =>
    url === '/api/registrations/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: {
            successCount: 0,
            failedCount: 1,
            successUids: [],
            failures: [{ rowNo: 2, uid: 'u1', reason: 'uid 不能为空' }],
          },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await allFailed.handleImport();
  assert.equal(allFailed.importResult.value?.successCount, 0);
  assert.equal(allFailed.importResult.value?.failedCount, 1);
  assert.match(lastMessage('error').text, /成功 0 条，失败 1 条/);
  assert.equal(listReads('/api/registrations').length, 0, '成功数为 0 不得刷新列表');
});

await checkAsync('注册导入：HTTP 失败保留文件可重试，重试成功记录结果', async () => {
  const state = useRegistration();
  state.openImportModal();
  const file = makeFile('registrations.xlsx');
  state.handleImportFileChange(file);
  resetObservations();

  responder = async () => json({ code: 500, msg: '注册服务暂不可用' }, 503);
  await state.handleImport();
  assert.equal(state.importFile.value, file, 'HTTP 失败必须保留文件以支持重试');
  assert.equal(state.importResult.value, null, '失败不得显示任何成功结果');
  assert.equal(lastMessage('error').text, '注册服务暂不可用');

  responder = async (url) =>
    url === '/api/registrations/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: { successCount: 1, failedCount: 0, successUids: ['u1'], failures: [] },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await state.handleImport();
  assert.deepEqual(state.importResult.value?.successUids, ['u1']);
  assert.equal(state.importFile.value, null);
  assert.equal(state.submitting.value, false);
});

await checkAsync('注册导入：在途与通过/打回/批量通过共享 submitting 互斥，且不得换文件/关弹窗', async () => {
  const state = useRegistration();
  state.openImportModal();
  const file = makeFile('registrations.xlsx');
  state.handleImportFileChange(file);
  resetObservations();

  const postUrls = [];
  let release;
  responder = (url, init) => {
    if (url === '/api/registrations/import') {
      postUrls.push(`${init.method} ${url}`);
      return new Promise((resolve) => {
        release = resolve;
      });
    }
    if (init?.method === 'POST') {
      postUrls.push(`${init.method} ${url}`);
      return json({ code: 200, msg: 'ok', data: null });
    }
    return json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  };

  const importing = state.handleImport();
  assert.equal(state.submitting.value, true, '导入在途必须持有提交锁');
  await state.handleImport();
  assert.deepEqual(postUrls, ['POST /api/registrations/import'], '在途重复点击不得新增请求');

  // 逐条通过：在途返回 false，对话框保持打开
  state.handleApprove({ uid: 'u1', username: 'n1', email: 'n1@example.com', status: 0 });
  assert.equal(
    await globalThis.__lastDialog.onPositiveClick(),
    false,
    '导入在途时逐条通过必须返回 false',
  );
  // 批量通过：共享同一把锁
  state.selectedIds.value = ['u1', 'u2'];
  state.handleBatchApprove();
  assert.equal(
    await globalThis.__lastDialog.onPositiveClick(),
    false,
    '导入在途时批量通过必须返回 false',
  );
  // 打回提交：共享同一把锁
  state.openRejectModal({ uid: 'u1', username: 'n1', email: 'n1@example.com' });
  state.rejectForm.reason = '资料不全';
  assert.equal(await state.handleRejectSubmit(), false, '导入在途时打回必须返回 false');
  assert.deepEqual(postUrls, ['POST /api/registrations/import'], '互斥期间不得新增任何 POST');

  // 在途不得换文件/关闭弹窗
  assert.equal(state.handleImportFileChange(makeFile('other.xlsx')), false);
  assert.equal(state.importFile.value, file);
  assert.equal(state.closeImportModal(), false);
  assert.equal(state.showImportModal.value, true);

  release(
    json({
      code: 200,
      msg: 'ok',
      data: { successCount: 1, failedCount: 0, successUids: ['u1'], failures: [] },
    }),
  );
  await importing;
  assert.equal(state.submitting.value, false, '完成后必须释放互斥锁');
  assert.deepEqual(state.importResult.value?.successUids, ['u1']);
});

await checkAsync('注册导入：关闭清理结果，重新打开无旧文件/旧结果', async () => {
  const state = useRegistration();
  state.openImportModal();
  state.handleImportFileChange(makeFile('registrations.xlsx'));
  responder = async (url) =>
    url === '/api/registrations/import'
      ? json({
          code: 200,
          msg: 'ok',
          data: { successCount: 1, failedCount: 0, successUids: ['u1'], failures: [] },
        })
      : json({ code: 200, msg: 'ok', data: { list: [], total: 0 } });
  await state.handleImport();
  assert.deepEqual(state.importResult.value?.successUids, ['u1']);

  // 选择下一批文件不得提前清掉上一批结果（只在下一次导入或关闭时替换）
  const nextFile = makeFile('registrations-next.xlsx');
  assert.equal(state.handleImportFileChange(nextFile), true);
  assert.equal(state.importFile.value, nextFile);
  assert.deepEqual(state.importResult.value?.successUids, ['u1']);

  assert.equal(state.closeImportModal(), true);
  assert.equal(state.importResult.value, null, '关闭后必须清理结果');
  assert.equal(state.importFile.value, null);

  state.importFile.value = makeFile('stale.xlsx');
  state.importResult.value = {
    successCount: 1,
    failedCount: 0,
    successUids: ['stale'],
    failures: [],
  };
  state.handleImportModalAfterLeave();
  assert.equal(state.importResult.value, null, 'after-leave 必须兜底清理结果');
  assert.equal(state.importFile.value, null, 'after-leave 必须兜底清理文件');

  state.importFile.value = makeFile('stale.xlsx');
  state.importResult.value = {
    successCount: 1,
    failedCount: 0,
    successUids: ['stale'],
    failures: [],
  };
  state.openImportModal();
  assert.equal(state.importResult.value, null, '新打开会话不得沿用旧结果');
  assert.equal(state.importFile.value, null, '新打开会话不得沿用旧文件');
});

// --------------------------------------------------
// D. 页面接线与文案（行为已在上方真实调用覆盖，这里只补 UI 约束）
// --------------------------------------------------
check('页面接线：两页可选 xls/xlsx 单文件，在途禁用换文件，关闭后清理结果', () => {
  for (const file of [
    'src/views/admin/UserManage/UserList.vue',
    'src/views/admin/UserManage/Registration.vue',
  ]) {
    const source = read(file);
    assert.match(source, /accept="\.xlsx,\.xls"/, `${file} 必须接受 .xls/.xlsx`);
    assert.match(source, /:max="1"/, `${file} 必须限制单文件`);
    assert.ok(source.includes('@change="handleImportUploadChange"'), `${file} 必须真实处理文件选择`);
    assert.ok(source.includes(':file-list="importFileList"'), `${file} 上传列表必须受控，拒绝/导入后不残留旧文件`);
    assert.ok(source.includes(':disabled="submitting"'), `${file} 导入在途必须禁用更换文件`);
    assert.ok(source.includes('@after-leave="handleImportModalAfterLeave"'), `${file} 关闭后必须清理结果`);
    assert.ok(source.includes('@click="openImportModal"'), `${file} 必须有真实导入入口`);
    assert.ok(source.includes('1000'), `${file} 必须说明单次最多 1000 行`);
  }
});

check('表头说明：用户 9 列 / 注册 8 列与后端顺序一致，注册无假模板', () => {
  const userList = read('src/views/admin/UserManage/UserList.vue');
  assert.ok(
    userList.includes('uid、username、email、password、phone、avatar、collegeId、classId、grade'),
    '用户导入必须列出后端 9 列表头',
  );
  const registration = read('src/views/admin/UserManage/Registration.vue');
  assert.ok(
    registration.includes('uid、username、password、email、collegeId、classId、grade、qq'),
    '注册导入必须列出后端 8 列表头',
  );
  assert.ok(!registration.includes('下载模板'), '注册名单没有模板接口，不得提供假模板');
});

check('结果展示：用户初始密码/失败原因、注册成功 UID/失败原因、用户模板下载保留', () => {
  const userList = read('src/views/admin/UserManage/UserList.vue');
  assert.ok(userList.includes('handleDownloadTemplate'), '用户模板下载必须保留');
  assert.ok(
    userList.includes('createdUsers') && userList.includes('initialPassword'),
    '用户结果必须展示后端返回的初始密码',
  );
  assert.ok(
    userList.includes('failures') && userList.includes('failure.reason'),
    '用户结果必须展示失败行 UID 与原因',
  );
  const registration = read('src/views/admin/UserManage/Registration.vue');
  assert.ok(registration.includes('successUids'), '注册结果必须展示成功 UID');
  assert.ok(
    registration.includes('failures') && registration.includes('failure.reason'),
    '注册结果必须展示失败行 UID 与原因',
  );
  assert.ok(
    registration.includes('只修正失败行后再上传'),
    '部分成功必须提示只修正失败行后再上传',
  );
});

check('真实路径：用户/注册导入各自调用后端路由，注册不虚构模板接口', () => {
  const api = read('src/utils/api.ts');
  assert.ok(
    api.includes("post<UserImportResultVo>('/api/users/import', form)"),
    '必须调用真实用户导入路径',
  );
  assert.ok(
    api.includes("post<RegistrationImportResultVo>('/api/registrations/import', form)"),
    '必须调用真实注册导入路径',
  );
  assert.ok(api.includes('downloadUserImportTemplate'), '用户模板下载必须保留');
  assert.ok(!api.includes('/api/registrations/import/template'), '不得虚构注册模板下载接口');
  assert.ok(!/registration[A-Za-z]*Template/i.test(api), '不得虚构注册模板下载函数');
});

check('敏感结果不落存储/日志：两个 composable 无 localStorage/sessionStorage/console', () => {
  for (const file of [
    'src/composables/admin/useUserManage.ts',
    'src/composables/admin/useRegistration.ts',
  ]) {
    const source = read(file);
    assert.ok(!source.includes('localStorage'), `${file} 不得写本地存储`);
    assert.ok(!source.includes('sessionStorage'), `${file} 不得写会话存储`);
    assert.ok(!source.includes('console.'), `${file} 不得输出日志`);
  }
});

console.log(`\n${passed} import checks passed`);
