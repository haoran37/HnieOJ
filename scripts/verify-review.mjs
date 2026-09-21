// 前端行为回归：用真实 composable / 真实 SFC setup 验证行为，只替换网络与 UI 依赖（桩），不镜像实现。
// 覆盖：useUserSettings.reset 清空、Status.vue 重试互斥、TrainingEdit 密码提示、UserDetailVo camelCase 字段、
// DiscussDetail 板块中文映射、useContestMode 本地计时与同步。
// 运行：node scripts/verify-review.mjs（仓库根目录）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, compileScript } from 'vue/compiler-sfc';
import { transformWithEsbuild } from 'vite';
import { createRenderer, defineComponent } from 'vue';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcRoot = path.join(root, 'src');
const dataUrl = (code) => `data:text/javascript,${encodeURIComponent(code)}`;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ---------------- UI / 网络桩（沿用现有脚本的 data: 模块替换方式） ----------------
const messages = [];
globalThis.__msg = {
  success: (value) => messages.push({ type: 'success', value }),
  error: (value) => messages.push({ type: 'error', value }),
  warning: (value) => messages.push({ type: 'warning', value }),
};
globalThis.__api = {};
globalThis.__route = { params: {}, query: {} };
globalThis.__router = {
  push: () => Promise.resolve(),
  replace: () => Promise.resolve(),
  back: () => {},
};

const naiveUiStubUrl = dataUrl(
  [
    'export const useMessage = () => globalThis.__msg;',
    'export const NButton = {};',
    'export const NTag = {};',
    'export const NSpace = {};',
    'export const NTooltip = {};',
    'export const NPopconfirm = {};',
  ].join('\n'),
);
const vueRouterStubUrl = dataUrl(
  'export const useRouter = () => globalThis.__router;\nexport const useRoute = () => globalThis.__route;',
);

// 只桩掉被测模块直接依赖的 api 函数；未赋值的调用会抛 TypeError，避免“假通过”
const API_STUB_NAMES = [
  'changeUserPassword',
  'checkProblem',
  'createAdminTraining',
  'createDiscussionAnswer',
  'createDiscussionComment',
  'deleteAdminTraining',
  'getAdminTrainingDetail',
  'getAdminTrainings',
  'getClasses',
  'getColleges',
  'getDiscussionDetail',
  'getGrades',
  'getJudgeOutbox',
  'getMyProfileChangeRequests',
  'getProfile',
  'getSystemTime',
  'retryJudgeOutbox',
  'submitProfileChangeRequest',
  'updateAdminTraining',
  'updateAdminTrainingStatus',
  'updateUserProfile',
  'voteDiscussion',
];
const apiStubUrl = dataUrl(
  API_STUB_NAMES.map(
    (name) => `export const ${name} = (...args) => globalThis.__api.${name}(...args);`,
  ).join('\n'),
);

// registerHooks 之前先解析真实 vue 入口，供 data: 模块（编译后的 SFC）使用
const vueEntryUrl = import.meta.resolve('vue');
const stubbedApiParents = /(?:useUserSettings|useContestMode|useDiscussDetail|useTrainingManage)\.ts$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ?? '';
    if (specifier === 'vue' && parent.startsWith('data:')) {
      return { url: vueEntryUrl, shortCircuit: true };
    }
    if (specifier === '@/utils/api' && (parent.startsWith('data:') || stubbedApiParents.test(parent))) {
      return { url: apiStubUrl, shortCircuit: true };
    }
    if (specifier === 'naive-ui') return { url: naiveUiStubUrl, shortCircuit: true };
    if (specifier === 'vue-router') return { url: vueRouterStubUrl, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      let target = path.join(srcRoot, specifier.slice(2));
      if (!path.extname(target)) {
        if (fs.existsSync(`${target}.ts`)) target = `${target}.ts`;
        else if (fs.existsSync(path.join(target, 'index.ts'))) target = path.join(target, 'index.ts');
      }
      return nextResolve(pathToFileURL(target).href, context);
    }
    return nextResolve(specifier, context);
  },
});

let failures = 0;
async function test(name, fn) {
  messages.length = 0;
  globalThis.__api = {};
  try {
    await fn();
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + ': ' + (error && error.message));
  }
}

// ---------------- useUserSettings.reset ----------------
await test('reset：清空旧账号手机号/CF 等字段，作废的 load 响应不得回填', async () => {
  const { useUserSettings } = await import(
    pathToFileURL(path.join(srcRoot, 'composables/oj/useUserSettings.ts')).href
  );
  const state = useUserSettings();

  globalThis.__api.getProfile = async () => ({
    uid: 'A',
    username: 'account-A',
    email: 'a@example.com',
    phone: '13800000000',
    cfUsername: 'cf-A',
    qq: '123456',
    github: 'https://github.com/a',
    blog: 'https://a.example',
  });
  await state.loadProfile();
  assert.equal(state.profile.phone, '13800000000');
  assert.equal(state.profile.cfUsername, 'cf-A');

  // 账号 A 的字段同样进入资料变更申请表单
  state.identity.email = 'a@example.com';
  state.identity.phone = '13800000000';
  state.identity.qq = '123456';
  state.identity.cfUsername = 'cf-A';
  state.identity.github = 'https://github.com/a';
  state.identity.blog = 'https://a.example';

  // 作废的在途 load：reset 后迟到的账号 A 响应不得回填
  const lateProfile = deferred();
  globalThis.__api.getProfile = () => lateProfile.promise;
  const pending = state.loadProfile();
  state.reset();

  for (const field of ['phone', 'cfUsername']) {
    assert.equal(state.profile[field], '', `reset 后 profile.${field} 应为空`);
  }
  for (const field of ['email', 'phone', 'qq', 'cfUsername', 'github', 'blog']) {
    assert.equal(state.identity[field], '', `reset 后 identity.${field} 应为空`);
  }

  lateProfile.resolve({
    uid: 'A',
    username: 'account-A',
    email: 'a@example.com',
    phone: '13800000000',
    cfUsername: 'cf-A',
    qq: '123456',
  });
  await pending;
  assert.equal(state.profile.phone, '', '作废的 load 不得回填手机号');
  assert.equal(state.profile.cfUsername, '', '作废的 load 不得回填 CF 用户名');
  assert.equal(state.identity.phone, '');
  assert.equal(state.identity.cfUsername, '');

  // reset 之后仍能加载新账号（不会把状态锁死）
  globalThis.__api.getProfile = async () => ({
    uid: 'B',
    username: 'account-B',
    phone: '13900000000',
    cfUsername: 'cf-B',
  });
  await state.loadProfile();
  assert.equal(state.profile.phone, '13900000000');
  assert.equal(state.profile.cfUsername, 'cf-B');
});

// ---------------- Status.vue 真实 handleRetry ----------------
let statusModulePromise = null;
function loadStatusModule() {
  if (!statusModulePromise) {
    statusModulePromise = (async () => {
      const source = fs.readFileSync(
        path.join(srcRoot, 'views/admin/SystemManage/Status.vue'),
        'utf-8',
      );
      const { descriptor, errors } = parse(source);
      if (errors.length) throw new Error(`Status.vue 解析失败：${errors[0].message}`);
      const compiled = compileScript(descriptor, { id: 'status' });
      const { code } = await transformWithEsbuild(compiled.content, 'Status.ts', { loader: 'ts' });
      return import(dataUrl(code));
    })();
  }
  return statusModulePromise;
}
async function createStatus() {
  const mod = await loadStatusModule();
  // setup 在组件实例外调用：屏蔽 onMounted 的实例告警，其余行为保持真实
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    return mod.default.setup({}, { expose() {} });
  } finally {
    console.warn = originalWarn;
  }
}
const actionsColumnOf = (state) => state.columns.find((column) => column.key === 'actions');
const retryButtonOf = (state, row) => {
  const child = actionsColumnOf(state).render(row).children.default()[0];
  // sent 行按钮包在 NTooltip 里，活动按钮需要透过 trigger 取
  return typeof child.children?.trigger === 'function' ? child.children.trigger() : child;
};

await test('重试：同/不同行连点只 POST 一次，刷新结束前保持全局互斥', async () => {
  const state = await createStatus();
  const retried = [];
  const post = deferred();
  const refresh = deferred();
  globalThis.__api.retryJudgeOutbox = (id) => {
    retried.push(id);
    return post.promise;
  };
  globalThis.__api.getJudgeOutbox = () => refresh.promise;

  const rowA = { id: 11, status: 'failed' };
  const rowB = { id: 12, status: 'exhausted' };
  const first = state.handleRetry(rowA);
  await state.handleRetry(rowA);
  await state.handleRetry(rowB);
  assert.equal(retried.length, 1, '连点 A/A/B 只允许一次 POST');
  assert.equal(retried[0], 11);
  assert.equal(state.retryingId.value, 11);

  const activeButton = retryButtonOf(state, rowA);
  const otherButton = retryButtonOf(state, rowB);
  assert.equal(activeButton.props.loading, true, '活动行按钮应 loading');
  assert.equal(activeButton.props.disabled, true, '在途所有重试按钮禁用');
  assert.equal(otherButton.props.disabled, true, '在途所有重试按钮禁用');
  assert.equal(otherButton.props.loading, false);

  post.resolve(null);
  await tick();
  assert.equal(state.retryingId.value, 11, '刷新在途仍互斥');
  await state.handleRetry(rowB);
  await tick();
  assert.equal(retried.length, 1, '刷新结束前不得再次 POST');

  refresh.resolve({ list: [], total: 0 });
  await first;
  assert.equal(state.retryingId.value, null, '刷新完成后释放互斥');
  assert.equal(retryButtonOf(state, rowB).props.disabled, false, '互斥释放后按钮恢复可用');
});

await test('重试：失败释放互斥可重试，sent 行不 POST', async () => {
  const state = await createStatus();
  const retried = [];
  globalThis.__api.getJudgeOutbox = async () => ({ list: [], total: 0 });
  globalThis.__api.retryJudgeOutbox = async (id) => {
    retried.push(id);
    throw new Error('后端失败');
  };

  await state.handleRetry({ id: 21, status: 'failed' });
  assert.equal(retried.length, 1);
  assert.equal(state.retryingId.value, null, '失败后应释放互斥');
  assert.equal(messages.at(-1)?.type, 'error');

  globalThis.__api.retryJudgeOutbox = async (id) => {
    retried.push(id);
    return null;
  };
  await state.handleRetry({ id: 21, status: 'failed' });
  assert.equal(retried.length, 2, '失败恢复后应可重试');

  await state.handleRetry({ id: 22, status: 'sent' });
  assert.equal(retried.length, 2, 'sent 行不得 POST');
  assert.equal(messages.at(-1)?.type, 'warning');
  assert.equal(messages.at(-1)?.value, '已发送的任务不能重试');
  assert.equal(retryButtonOf(state, { id: 22, status: 'sent' }).props.disabled, true);
});

// ---------------- TrainingEdit 密码提示与实际行为一致 ----------------
await test('密码提示：详情带入当前密码，空值提交转 null 保留原密码', async () => {
  const source = fs.readFileSync(
    path.join(srcRoot, 'views/admin/TrainingManage/TrainingList/components/TrainingEdit.vue'),
    'utf-8',
  );
  const hint = source.match(/<span class="pwd-hint">([^<]*)<\/span>/)?.[1] ?? '';
  assert.ok(hint.length > 0, '应保留密码提示');
  assert.ok(!hint.includes('不回显'), '受保护详情会带入当前密码，提示不得再声称不回显');
  assert.ok(hint.includes('带入'), '提示应说明当前密码由管理端详情带入');
  assert.ok(hint.includes('留空提交即保留原密码'), '提示应说明空值提交保留原密码');

  const { useTrainingForm } = await import(
    pathToFileURL(path.join(srcRoot, 'composables/admin/useTrainingManage.ts')).href
  );
  const saved = [];
  globalThis.__api.getAdminTrainingDetail = async () => ({
    id: 5,
    title: '私有题单',
    type: 'Official',
    auth: 'Private',
    privatePwd: 'origin-pwd',
    description: '',
    status: true,
    rank: 0,
    problems: [],
  });
  globalThis.__api.updateAdminTraining = async (id, payload) => {
    saved.push({ id, payload });
    return null;
  };

  const state = useTrainingForm();
  await state.loadData(5);
  assert.equal(state.formValue.privatePwd, 'origin-pwd', '受保护详情会带回当前密码');
  state.formValue.privatePwd = '';
  await state.handleSubmit(true, 5);
  assert.equal(saved.length, 1, '应发送一次保存');
  assert.equal(saved[0].payload.privatePwd, null, '空密码必须传 null 由后端保留原密码');
});

// ---------------- UserDetailVo 真实 camelCase ----------------
await test('用户详情：类型与消费改用后端真实 cfUsername', () => {
  const apiSource = fs.readFileSync(path.join(srcRoot, 'utils/api.ts'), 'utf-8');
  const start = apiSource.indexOf('export interface UserDetailVo');
  const end = apiSource.indexOf('export interface UserAchievementVo');
  assert.ok(start >= 0 && end > start, '应能定位 UserDetailVo');
  const userDetailVo = apiSource.slice(start, end);
  assert.match(userDetailVo, /cfUsername: string \| null/, 'UserDetailVo 应声明 cfUsername');
  assert.ok(!/cf_username/.test(userDetailVo), 'UserDetailVo 不得保留错拼 cf_username');

  const userListSource = fs.readFileSync(
    path.join(srcRoot, 'views/admin/UserManage/UserList.vue'),
    'utf-8',
  );
  assert.match(userListSource, /detail\.cfUsername/, 'UserList 详情应读取 detail.cfUsername');
  assert.ok(!/cf_username/.test(userListSource), 'UserList 不得再读错拼字段');
});

// ---------------- DiscussDetail 侧栏复用 CATEGORY_LABEL ----------------
await test('讨论侧栏：板块使用既有 CATEGORY_LABEL，中文与顶部标签一致', async () => {
  const source = fs.readFileSync(
    path.join(srcRoot, 'views/oj/DiscussPage/DiscussDetail.vue'),
    'utf-8',
  );
  assert.match(
    source,
    /import\s*\{[^}]*CATEGORY_LABEL[^}]*\}\s*from\s*'@\/composables\/oj\/useDiscussDetail'/,
    '应从既有 composable 引入 CATEGORY_LABEL',
  );
  assert.match(source, /CATEGORY_LABEL\[post\.category\]/, '侧栏应使用 CATEGORY_LABEL 映射');
  assert.ok(!/\{\{\s*post\.category\s*\}\}/.test(source), '侧栏不得直接渲染原始 enum');

  const { useDiscussDetail, CATEGORY_LABEL } = await import(
    pathToFileURL(path.join(srcRoot, 'composables/oj/useDiscussDetail.ts')).href
  );
  assert.equal(CATEGORY_LABEL.Site, '站内事务');
  assert.equal(CATEGORY_LABEL.Problem, '题目讨论');

  globalThis.__api.getDiscussionDetail = async () => ({
    post: {
      id: 1,
      title: '站内帖',
      content: 'c',
      category: 'Site',
      problemCode: null,
      gmtCreate: null,
      viewNum: 0,
      likeNum: 0,
    },
    answers: [],
  });
  const state = useDiscussDetail();
  await state.fetchDetail('1');
  assert.equal(state.post.value.category, 'Site');
  // 顶部标签已按 CATEGORY_LABEL 渲染；侧栏取同一映射即为一致
  assert.deepEqual(state.post.value.tags, [CATEGORY_LABEL.Site]);
});

// ---------------- useContestMode 本地 tick + 60s 同步 ----------------
const { useContestMode, formatSystemTime } = await import(
  pathToFileURL(path.join(srcRoot, 'composables/admin/useContestMode.ts')).href
);

const noop = () => {};
const nodeOps = {
  insert: noop,
  remove: noop,
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: noop,
  setElementText: noop,
  parentNode: () => null,
  nextSibling: () => null,
  patchProp: noop,
  setScopeId: noop,
  cloneNode: (node) => node,
  insertStaticContent: () => [null, null],
  querySelector: () => null,
};
const { createApp } = createRenderer(nodeOps);
function mountContestMode() {
  let state = null;
  const component = defineComponent({
    setup() {
      state = useContestMode();
      return () => null;
    },
  });
  const app = createApp(component);
  const before = intervals.length;
  app.mount({});
  const created = intervals.slice(before);
  return {
    state,
    created,
    tickTimer: created.find((item) => item.ms === 1000),
    syncTimer: created.find((item) => item.ms === 60_000),
    unmount: () => app.unmount(),
  };
}

const realSetInterval = globalThis.setInterval;
const realClearInterval = globalThis.clearInterval;
const realDateNow = Date.now;
let intervals = [];
let clearedIds = [];
let clock = 0;
function installTimerStubs() {
  intervals = [];
  clearedIds = [];
  globalThis.setInterval = (fn, ms) => {
    const id = { fn, ms };
    intervals.push(id);
    return id;
  };
  globalThis.clearInterval = (id) => {
    clearedIds.push(id);
  };
  Date.now = () => clock;
}
function restoreTimerStubs() {
  globalThis.setInterval = realSetInterval;
  globalThis.clearInterval = realClearInterval;
  Date.now = realDateNow;
}
async function runWithFakeClock(fn) {
  installTimerStubs();
  try {
    await fn();
  } finally {
    restoreTimerStubs();
  }
}

await test('毫秒契约：offset=server-local，1 秒 tick 使用毫秒 epoch', async () => {
  await runWithFakeClock(async () => {
    clock = 1700000000000;
    globalThis.__api.getSystemTime = async () => ({
      unixTimestamp: 1700000005000,
      serverTime: null,
      timezone: 'Asia/Shanghai',
    });
    const contestMode = mountContestMode();
    const { state } = contestMode;
    assert.equal(contestMode.created.length, 2, '应创建本地 tick 与 60s 同步两个 timer');
    assert.equal(contestMode.tickTimer?.ms, 1000);
    assert.equal(contestMode.syncTimer?.ms, 60_000);
    assert.equal(state.loading.value, true);
    await tick();
    assert.equal(state.loading.value, false);
    assert.equal(
      state.systemTime.value,
      formatSystemTime(1700000005000),
      'Date.now=1700000000000 + offset 5000 应显示服务端毫秒时间',
    );

    clock = 1700000001000;
    contestMode.tickTimer.fn();
    assert.equal(
      state.systemTime.value,
      formatSystemTime(1700000006000),
      '1 秒 tick 后应推进到 1700000006000',
    );
    contestMode.unmount();
  });
});

await test('同步：每秒 tick 不发请求、60s 同步不叠请求、有效同步替换 offset', async () => {
  await runWithFakeClock(async () => {
    clock = 1700000000000;
    let systemCalls = 0;
    globalThis.__api.getSystemTime = async () => {
      systemCalls += 1;
      return { unixTimestamp: 1700000005000, serverTime: null };
    };
    const contestMode = mountContestMode();
    assert.equal(systemCalls, 1, '挂载时同步一次');
    await tick();
    assert.equal(contestMode.state.systemTime.value, formatSystemTime(1700000005000));

    contestMode.tickTimer.fn();
    contestMode.tickTimer.fn();
    await tick();
    assert.equal(systemCalls, 1, '本地每秒 tick 不得发 HTTP');

    const pendingSync = deferred();
    globalThis.__api.getSystemTime = () => {
      systemCalls += 1;
      return pendingSync.promise;
    };
    contestMode.syncTimer.fn();
    contestMode.syncTimer.fn();
    contestMode.syncTimer.fn();
    await tick();
    assert.equal(systemCalls, 2, '同步在途不得叠加请求');

    clock = 1700000001000;
    pendingSync.resolve({ unixTimestamp: 1700000099000, serverTime: null });
    await tick();
    assert.equal(
      contestMode.state.systemTime.value,
      formatSystemTime(1700000099000),
      '第二次有效同步应替换 offset',
    );

    clock = 1700000002000;
    contestMode.tickTimer.fn();
    assert.equal(contestMode.state.systemTime.value, formatSystemTime(1700000100000));

    globalThis.__api.getSystemTime = async () => {
      systemCalls += 1;
      return { unixTimestamp: 1700000100000, serverTime: null };
    };
    contestMode.syncTimer.fn();
    await tick();
    assert.equal(systemCalls, 3, '上一次同步完成后仍可继续同步');
    contestMode.unmount();
  });
});

await test('非法/失败响应：保留上次有效校准；0 与负 epoch 有效；无校准显示 --', async () => {
  await runWithFakeClock(async () => {
    clock = 1700000000000;
    globalThis.__api.getSystemTime = async () => ({
      unixTimestamp: 1700000005000,
      serverTime: null,
    });
    const calibrated = mountContestMode();
    await tick();
    assert.equal(calibrated.state.systemTime.value, formatSystemTime(1700000005000));

    for (const bad of [null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      globalThis.__api.getSystemTime = async () => ({ unixTimestamp: bad, serverTime: null });
      calibrated.syncTimer.fn();
      await tick();
    }
    clock = 1700000001000;
    calibrated.tickTimer.fn();
    assert.equal(
      calibrated.state.systemTime.value,
      formatSystemTime(1700000006000),
      '非法时间戳不得破坏上次有效校准',
    );

    // 网络暂时失败：继续已有本地计时
    globalThis.__api.getSystemTime = async () => {
      throw new Error('offline');
    };
    calibrated.syncTimer.fn();
    await tick();
    clock = 1700000002000;
    calibrated.tickTimer.fn();
    assert.equal(
      calibrated.state.systemTime.value,
      formatSystemTime(1700000007000),
      '同步失败后本地计时继续',
    );
    calibrated.unmount();

    // 无有效校准：显示 --，绝不用 Date(null)=1970 顶替
    globalThis.__api.getSystemTime = async () => ({ unixTimestamp: null, serverTime: null });
    const uncalibrated = mountContestMode();
    await tick();
    assert.equal(uncalibrated.state.systemTime.value, '--');
    assert.notEqual(uncalibrated.state.systemTime.value, formatSystemTime(0));
    uncalibrated.unmount();

    // epoch 0 是合法时间戳
    globalThis.__api.getSystemTime = async () => ({ unixTimestamp: 0, serverTime: null });
    const zero = mountContestMode();
    await tick();
    assert.equal(zero.state.systemTime.value, formatSystemTime(0), 'epoch 0 应视为有效校准');
    clock += 1000;
    zero.tickTimer.fn();
    assert.equal(zero.state.systemTime.value, formatSystemTime(1000), 'epoch 0 校准后仍本地计时');
    zero.unmount();

    // 负 epoch 是合法时间戳
    globalThis.__api.getSystemTime = async () => ({
      unixTimestamp: -1700000000000,
      serverTime: null,
    });
    const negative = mountContestMode();
    await tick();
    assert.equal(
      negative.state.systemTime.value,
      formatSystemTime(-1700000000000),
      '负 epoch 应视为有效校准',
    );
    negative.unmount();

    // serverTime 合法时可作兜底校准（unixTimestamp 非法）
    const serverTime = '2024-01-02T03:04:05';
    globalThis.__api.getSystemTime = async () => ({ unixTimestamp: null, serverTime });
    const fallback = mountContestMode();
    await tick();
    assert.equal(
      fallback.state.systemTime.value,
      formatSystemTime(Date.parse(serverTime)),
      'serverTime 合法时应可兜底',
    );
    fallback.unmount();
  });
});

await test('卸载：清理两个 timer，迟到响应不得改显示', async () => {
  await runWithFakeClock(async () => {
    clock = 1700000000000;
    globalThis.__api.getSystemTime = async () => ({
      unixTimestamp: 1700000005000,
      serverTime: null,
    });
    const contestMode = mountContestMode();
    await tick();
    assert.equal(contestMode.state.systemTime.value, formatSystemTime(1700000005000));

    const late = deferred();
    globalThis.__api.getSystemTime = () => late.promise;
    contestMode.syncTimer.fn();
    await tick();
    const before = contestMode.state.systemTime.value;

    contestMode.unmount();
    assert.deepEqual(clearedIds, [contestMode.tickTimer, contestMode.syncTimer], '卸载应清理两个 timer');

    clock = 1700000009000;
    contestMode.tickTimer.fn();
    late.resolve({ unixTimestamp: 1700009999000, serverTime: null });
    await tick();
    assert.equal(contestMode.state.systemTime.value, before, '卸载后迟到响应不得改显示');
  });
});

console.log(failures ? `\n${failures} checks FAILED` : '\nall review-rework behavior checks passed');
process.exitCode = failures ? 1 : 0;
