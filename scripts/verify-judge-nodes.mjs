// 判题节点安全 API 回归（Bootstrap 签发 / 排空恢复 / 吊销 / 会话代号 / 凭据清理）：
// - 正式与临时节点都走 POST /api/admin/judge/nodes/bootstrap-tokens，字段严格按 CreateNodeBootstrapRequest；
// - 生命周期走 /tokens/{id}/drain 与 /tokens/{id}/enable，吊销保留 /revoke；
// - 已退休接口（formal-tokens、auth-codes、draining 路由）不得再被调用，VO 不存在的字段不得读取；
// - 账号/路由切换后作废在途旧响应，凭据只在当前会话内存中保存、不写浏览器存储、不打印。
// 运行：node scripts/verify-judge-nodes.mjs（在仓库根目录）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const nodeRequire = createRequire(import.meta.url);
const ts = nodeRequire('typescript');

// ---- 浏览器存储桩：源码不得写凭据，测试只提供只读 token ----
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// ---- 可控 fetch ----
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
const lastCall = () => calls[calls.length - 1];
const lastBody = () => (lastCall().init.body ? JSON.parse(lastCall().init.body) : null);

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      let target = path.join(root, 'src', specifier.slice(2));
      if (!path.extname(target)) target = `${target}.ts`;
      return next(pathToFileURL(target).href, context);
    }
    return next(specifier, context);
  },
});

const {
  useJudgeNodes,
  isNodeExpired,
  JUDGE_NODE_STATUS,
  MAX_BOOTSTRAP_TTL_MS,
} = await import(pathToFileURL(path.join(root, 'src/composables/admin/useJudgeNodes.ts')));

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + ': ' + (error && error.message));
  }
}

// ---- 组件级行为桩：真实转译 Service.vue 的 <script setup>，只桩掉外部依赖 ----
function loadService(overrides = {}) {
  const source = fs
    .readFileSync(path.join(root, 'src/views/admin/SystemManage/Service.vue'), 'utf8')
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const messages = { success: [], warning: [], error: [] };
  const dialogs = [];
  const ref = (value) => ({ value });
  const state = {
    nodes: ref([]),
    tokens: ref([]),
    remoteAccounts: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchNodes: async () => 'ok',
    fetchTokens: async () => 'ok',
    fetchRemoteAccounts: async () => 'ok',
    resetSession: () => {},
    createBootstrapToken: async () => ({ bootstrapToken: 'bt', nodeType: 'formal' }),
    revokeToken: async () => {},
    drainNode: async () => {},
    enableNode: async () => {},
    ...overrides,
  };
  const context = {
    exports: {},
    require(name) {
      if (name === 'vue') {
        return {
          ref,
          reactive: (value) => value,
          h: () => {},
          onMounted: () => {},
          onUnmounted: () => {},
          watch: () => {},
        };
      }
      if (name === 'vue-router') return { onBeforeRouteLeave: () => {} };
      if (name === 'naive-ui') {
        return {
          useMessage: () => ({
            success: (text) => messages.success.push(text),
            warning: (text) => messages.warning.push(text),
            error: (text) => messages.error.push(text),
          }),
          useDialog: () => ({ warning: (options) => dialogs.push(options) }),
        };
      }
      if (name.includes('useTime')) return { formatFullTime: (value) => value };
      if (name.includes('userStore')) return { useUserStore: () => ({ token: 'session-token' }) };
      if (name.includes('useJudgeNodes')) {
        return {
          useJudgeNodes: () => state,
          JUDGE_MODES: ['default', 'spj', 'interactive'],
          JUDGE_NODE_STATUS: {
            ACTIVE: 'active',
            REVOKED: 'revoked',
            DRAINING: 'draining',
            DISABLED: 'disabled',
          },
          MAX_BOOTSTRAP_TTL_MS: 2592000000,
          isNodeExpired: (row) => {
            if (!row.expireTime) return false;
            const deadline = new Date(row.expireTime).getTime();
            return Number.isFinite(deadline) && deadline <= Date.now();
          },
        };
      }
      throw new Error('unexpected import ' + name);
    },
    Date,
    Set,
    Promise,
    console,
  };
  vm.createContext(context);
  vm.runInContext(
    `${code}\nglobalThis.subject={bootstrapForm,handleBootstrap,handleSessionReset,handleDrain,handleEnable,confirmRevoke,closeBootstrapModal,openBootstrapModal,onSecretShowUpdate,secretValue,showSecretModal,showBootstrapModal,submitting,pendingTokenIds,refreshAll};`,
    context,
  );
  return { subject: context.subject, state, messages, dialogs };
}

// ---- 行为：Bootstrap 一次性签发 ----
await check('正式节点：POST bootstrap-tokens，字段严格按 DTO', async () => {
  const expiresAt = Date.now() + 3600_000;
  responder = async () =>
    json({ code: 200, msg: 'ok', data: { authCodeId: 7, bootstrapToken: 'BT', nodeType: 'formal', expiresAt } });
  const state = useJudgeNodes();
  const result = await state.createBootstrapToken({
    nodeType: 'formal',
    nodeName: 'judge-node-01',
    maxConcurrency: 8,
    supportedJudgeModes: ['default', 'spj'],
    weight: 20,
    expiresAt,
    remark: 'r',
  });
  assert.equal(lastCall().url, '/api/admin/judge/nodes/bootstrap-tokens');
  assert.equal(lastCall().init.method, 'POST');
  assert.deepEqual(lastBody(), {
    nodeType: 'formal',
    nodeName: 'judge-node-01',
    maxConcurrency: 8,
    supportedJudgeModes: ['default', 'spj'],
    weight: 20,
    expiresAt,
    remark: 'r',
  });
  assert.equal(result.bootstrapToken, 'BT');
  assert.equal(result.nodeType, 'formal');
});

await check('临时节点：authorizationUntil 原样传递，空可选字段省略', async () => {
  const expiresAt = Date.now() + 3600_000;
  const authorizationUntil = Date.now() + 7200_000;
  responder = async () =>
    json({ code: 200, msg: 'ok', data: { authCodeId: 8, bootstrapToken: 'BT2', nodeType: 'temp', expiresAt } });
  const state = useJudgeNodes();
  await state.createBootstrapToken({
    nodeType: 'temp',
    nodeName: 'temp-01',
    maxConcurrency: 2,
    expiresAt,
    authorizationUntil,
  });
  assert.deepEqual(lastBody(), {
    nodeType: 'temp',
    nodeName: 'temp-01',
    maxConcurrency: 2,
    expiresAt,
    authorizationUntil,
  });
});

// ---- 行为：生命周期路由 ----
await check('排空/恢复/吊销使用新生命周期路由', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: null });
  const state = useJudgeNodes();
  await state.drainNode('tok 1');
  assert.equal(lastCall().url, '/api/admin/judge/nodes/tokens/tok%201/drain');
  assert.equal(lastCall().init.method, 'POST');
  await state.enableNode('tok 1');
  assert.equal(lastCall().url, '/api/admin/judge/nodes/tokens/tok%201/enable');
  await state.revokeToken('tok 1');
  assert.equal(lastCall().url, '/api/admin/judge/nodes/tokens/tok%201/revoke');
});

// ---- 行为：会话代号丢弃在途旧响应 ----
await check('账号/路由切换后丢弃在途旧列表响应', async () => {
  let releaseStale;
  const staleGate = new Promise((resolve) => {
    releaseStale = resolve;
  });
  responder = () => staleGate;
  const state = useJudgeNodes();
  const pending = state.fetchNodes();
  state.resetSession();
  releaseStale(json({ code: 200, msg: 'ok', data: [{ tokenId: 'stale' }] }));
  await pending;
  assert.deepEqual(state.nodes.value, [], 'reset 后旧响应不得回填列表');
});

await check('reset 清理列表/远程账号并可从零重新加载', async () => {
  responder = async () => json({ code: 200, msg: 'ok', data: [{ tokenId: 'fresh', status: 'active' }] });
  const state = useJudgeNodes();
  await state.fetchNodes();
  assert.equal(state.nodes.value.length, 1);
  state.resetSession();
  assert.deepEqual(state.nodes.value, []);
  assert.deepEqual(state.remoteAccounts.value, []);
  await state.fetchNodes();
  assert.equal(state.nodes.value[0].tokenId, 'fresh');
});

await check('硬到期判定只看 expireTime', () => {
  assert.equal(isNodeExpired({ expireTime: null }), false);
  assert.equal(isNodeExpired({ expireTime: new Date(Date.now() - 1000).toISOString() }), true);
  assert.equal(isNodeExpired({ expireTime: new Date(Date.now() + 60_000).toISOString() }), false);
  assert.equal(JUDGE_NODE_STATUS.DRAINING, 'draining');
  assert.ok(MAX_BOOTSTRAP_TTL_MS > 0);
});

// ---- 行为：同一会话内并发列表读取，只有最新响应可以写入 ----
await check('并发列表读取：旧响应不得覆盖最新响应，也不得改写 loading', async () => {
  const gates = [];
  responder = () => new Promise((resolve) => gates.push(resolve));
  const state = useJudgeNodes();
  const first = state.fetchNodes();
  const second = state.fetchNodes();
  gates[1](json({ code: 200, msg: 'ok', data: [{ tokenId: 'newer' }] }));
  assert.equal(await second, 'ok');
  assert.deepEqual(state.nodes.value.map((node) => node.tokenId), ['newer']);
  gates[0](json({ code: 200, msg: 'ok', data: [{ tokenId: 'older' }] }));
  assert.equal(await first, 'stale', '被取代的旧请求必须返回 stale');
  assert.deepEqual(state.nodes.value.map((node) => node.tokenId), ['newer'], '旧响应不得覆盖最新响应');
  assert.equal(state.loading.value, false, '最新响应结束后必须复位 loading');
});

await check('并发列表读取：旧请求失败不得清空或污染最新列表', async () => {
  const gates = [];
  responder = () => new Promise((resolve) => gates.push(resolve));
  const state = useJudgeNodes();
  const first = state.fetchNodes();
  const second = state.fetchNodes();
  gates[1](json({ code: 200, msg: 'ok', data: [{ tokenId: 'newer' }] }));
  await second;
  gates[0](json({ code: 500, msg: 'boom', data: null }));
  assert.equal(await first, 'stale');
  assert.deepEqual(state.nodes.value.map((node) => node.tokenId), ['newer']);
  assert.equal(state.error.value, null, '旧请求失败不得写入 error');
});

await check('列表读取失败返回 error 并暴露错误信息', async () => {
  responder = async () => json({ code: 500, msg: '节点查询失败', data: null });
  const state = useJudgeNodes();
  assert.equal(await state.fetchNodes(), 'error');
  assert.equal(state.error.value, '节点查询失败');
  assert.equal(state.loading.value, false);
});

// ---- 行为：组件级会话/签发代次防护（真实转译 Service.vue） ----
await check('组件：切换账号作废在途签发，迟到响应不得回填一次性凭据', async () => {
  let resolveIssue;
  const gate = new Promise((resolve) => {
    resolveIssue = resolve;
  });
  const h = loadService({ createBootstrapToken: () => gate });
  h.subject.bootstrapForm.nodeName = 'race-reset';
  const pending = h.subject.handleBootstrap();
  h.subject.handleSessionReset();
  resolveIssue({ bootstrapToken: 'secret-after-reset', nodeType: 'formal' });
  await pending;
  assert.equal(h.subject.secretValue.value, '', '迟到响应不得回填凭据');
  assert.equal(h.subject.showSecretModal.value, false, '迟到响应不得弹出凭据模态');
  assert.deepEqual(h.messages.success, []);
});

await check('组件：关闭签发弹窗作废在途签发，迟到响应不得再弹出凭据', async () => {
  let resolveIssue;
  const gate = new Promise((resolve) => {
    resolveIssue = resolve;
  });
  const h = loadService({ createBootstrapToken: () => gate });
  h.subject.bootstrapForm.nodeName = 'race-close';
  const pending = h.subject.handleBootstrap();
  h.subject.closeBootstrapModal();
  assert.equal(h.subject.submitting.value, false, '关闭弹窗必须释放提交态');
  resolveIssue({ bootstrapToken: 'secret-after-close', nodeType: 'formal' });
  await pending;
  assert.equal(h.subject.secretValue.value, '');
  assert.equal(h.subject.showSecretModal.value, false);
});

await check('组件：切换账号后迟到的排空响应不得刷新列表或提示成功', async () => {
  let resolveRequest;
  const gate = new Promise((resolve) => {
    resolveRequest = resolve;
  });
  let fetchCount = 0;
  const h = loadService({
    drainNode: () => gate,
    fetchNodes: async () => {
      fetchCount += 1;
      return 'ok';
    },
  });
  const pending = h.subject.handleDrain({ tokenId: 'tok-1', status: 'active', expireTime: null });
  h.subject.handleSessionReset();
  resolveRequest({});
  await pending;
  assert.equal(fetchCount, 0, '旧会话不得再刷新列表');
  assert.deepEqual(h.messages.success, []);
  assert.deepEqual(h.messages.warning, []);
  assert.deepEqual(h.messages.error, []);
});

await check('组件：切换账号后迟到的吊销确认不得再发请求', async () => {
  let revokeCalls = 0;
  let fetchCount = 0;
  const h = loadService({
    revokeToken: async () => {
      revokeCalls += 1;
    },
    fetchNodes: async () => {
      fetchCount += 1;
      return 'ok';
    },
  });
  h.subject.confirmRevoke({ tokenId: 'tok-2', status: 'active', nodeName: 'n' });
  assert.equal(h.dialogs.length, 1);
  h.subject.handleSessionReset();
  await h.dialogs[0].onPositiveClick();
  assert.equal(revokeCalls, 0, '旧会话确认不得再吊销');
  assert.equal(fetchCount, 0);
});

await check('组件：旧签发的 finally 不得清除新签发的 submitting', async () => {
  let resolveFirst;
  let resolveSecond;
  let call = 0;
  const h = loadService({
    createBootstrapToken: () => {
      call += 1;
      return new Promise((resolve) => {
        if (call === 1) resolveFirst = resolve;
        else resolveSecond = resolve;
      });
    },
  });
  h.subject.bootstrapForm.nodeName = 'first';
  const first = h.subject.handleBootstrap();
  assert.equal(h.subject.submitting.value, true);
  h.subject.closeBootstrapModal();
  assert.equal(h.subject.submitting.value, false);
  h.subject.bootstrapForm.nodeName = 'second';
  const second = h.subject.handleBootstrap();
  assert.equal(h.subject.submitting.value, true);
  resolveFirst({ bootstrapToken: 'first-secret', nodeType: 'formal' });
  await first;
  assert.equal(h.subject.submitting.value, true, '旧 finally 不得清除新提交状态');
  assert.equal(h.subject.secretValue.value, '', '被关闭的旧签发不得回填凭据');
  resolveSecond({ bootstrapToken: 'second-secret', nodeType: 'formal' });
  await second;
  assert.equal(h.subject.submitting.value, false);
  assert.equal(h.subject.secretValue.value, 'second-secret');
});

await check('组件：生命周期成功但列表刷新失败时不得声称已确认成功', async () => {
  const h = loadService({ drainNode: async () => ({}), fetchNodes: async () => 'error' });
  await h.subject.handleDrain({ tokenId: 'tok-3', status: 'active', expireTime: null });
  assert.deepEqual(h.messages.success, [], '刷新失败不得提示成功');
  assert.equal(h.messages.warning.length, 1);
  assert.ok(h.messages.warning[0].includes('刷新失败'), '必须提示已提交但刷新失败');
});

await check('组件：生命周期成功且刷新成功才提示成功', async () => {
  const h = loadService({ drainNode: async () => ({}), fetchNodes: async () => 'ok' });
  await h.subject.handleDrain({ tokenId: 'tok-4', status: 'active', expireTime: null });
  assert.equal(h.messages.success.length, 1);
  assert.deepEqual(h.messages.warning, []);
});

// R5：回读结果由本次 await 直接返回，stale（被更新请求取代）既不算成功也不算失败。
await check('组件：回读 stale 时不得提示成功', async () => {
  const h = loadService({ drainNode: async () => ({}), fetchNodes: async () => 'stale' });
  await h.subject.handleDrain({ tokenId: 'tok-5', status: 'active', expireTime: null });
  assert.deepEqual(h.messages.success, [], '回读被更新请求取代时不得确认成功');
  assert.deepEqual(h.messages.warning, [], 'stale 不应误报刷新失败');
});

// R4：关闭秘钥弹窗必须同步清空明文，不能只依赖 @after-leave（动画/rAF 挂起时可能不触发）。
await check('组件：秘钥弹窗关闭事件同步清空明文', async () => {
  const h = loadService();
  h.subject.secretValue.value = 'one-time-secret';
  h.subject.showSecretModal.value = true;
  h.subject.onSecretShowUpdate(false);
  assert.equal(h.subject.secretValue.value, '', '关闭事件必须同步清空一次性凭据');
});

await check('组件：秘钥弹窗打开事件不清空明文', async () => {
  const h = loadService();
  h.subject.secretValue.value = 'keep-me';
  h.subject.onSecretShowUpdate(true);
  assert.equal(h.subject.secretValue.value, 'keep-me');
});

// ---- 源码级约束 ----
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');

await check('前端不再调用已退休接口', () => {
  const composable = read('src/composables/admin/useJudgeNodes.ts');
  for (const retired of ['formal-token', 'auth-codes', '/draining', 'rotate']) {
    assert.ok(!composable.includes(retired), `useJudgeNodes.ts 不得再调用 ${retired}`);
  }
  const service = read('src/views/admin/SystemManage/Service.vue');
  for (const retired of ['formal-token', 'auth-codes', '/draining', 'setDraining']) {
    assert.ok(!service.includes(retired), `Service.vue 不得再调用 ${retired}`);
  }
});

await check('列表不再读取不存在的 VO 字段，排空以 status===draining 判定', () => {
  const service = read('src/views/admin/SystemManage/Service.vue');
  assert.ok(!service.includes('row.draining'), '不得读取不存在的 row.draining');
  assert.ok(!service.includes('row.authorizationUntil'), '不得读取不存在的 row.authorizationUntil');
  assert.ok(!service.includes('row.approvedMaxConcurrency'), '不得读取不存在的 approvedMaxConcurrency');
  assert.ok(service.includes('row.status === JUDGE_NODE_STATUS.DRAINING'), '排空状态必须以 status===draining 判定');
  assert.ok(service.includes('row.maxConcurrency'), '并发必须展示 maxConcurrency');
  assert.ok(service.includes('row.expireTime'), '到期必须展示 expireTime');
});

await check('注册凭据不写浏览器存储、不打印，且仅在内存模态展示', () => {
  const service = read('src/views/admin/SystemManage/Service.vue');
  const composable = read('src/composables/admin/useJudgeNodes.ts');
  for (const source of [service, composable]) {
    assert.ok(!source.includes('localStorage'), '不得写 localStorage');
    assert.ok(!source.includes('sessionStorage'), '不得写 sessionStorage');
    assert.ok(!/console\.(log|info|debug|warn|error)/.test(source), '不得打印凭据');
  }
  assert.ok(service.includes('bootstrapToken'), '必须读取结果字段 bootstrapToken');
  assert.ok(service.includes('onBeforeRouteLeave'), '路由离开必须清理一次性凭据');
  assert.ok(service.includes('resetSession'), '账号切换必须作废旧会话');
  assert.ok(service.includes('clearSecret'), '关闭/离开必须清空凭据');
});

await check('签发与生命周期操作都有重复提交防护且 await 刷新', () => {
  const service = read('src/views/admin/SystemManage/Service.vue');
  assert.ok(service.includes('if (submitting.value) return'), '签发重复提交必须受控');
  assert.ok(service.includes('pendingTokenIds'), '生命周期操作必须有在途去重');
  assert.ok(service.includes('await refreshAll()'), '操作完成后必须 await 刷新');
  assert.ok(
    service.includes(
      'const refreshAll = (): Promise<JudgeReadOutcome> => handleTabChange(activeTab.value)',
    ),
    'refreshAll 必须把本次回读结果返回给调用方',
  );
});

console.log(failures ? `\n${failures} judge-node checks FAILED` : '\nall judge-node security checks passed');
process.exitCode = failures ? 1 : 0;
