// 前端行为回归：用真实 composable / 真实 SFC setup 验证行为，只替换网络与 UI 依赖（桩），不镜像实现。
// 覆盖：useUserSettings 资料 wire 契约（响应 cf_username / 申请 cfUsername）与 reset 清空、
// Status.vue 重试互斥、TrainingEdit 密码提示与实际行为、UserDetailVo cf_username 字段与消费、
// DiscussDetail 板块中文映射、useContestMode 本地计时与同步、
// DiscussDetail 陈旧写入回调（回答/评论/投票）不得刷新错误路由或影响新路由草稿。
// 运行：node scripts/verify-review.mjs（仓库根目录，Node 22.18+ / 24 直接执行，无需 flags）
//
// 与其余 verify 脚本一致：原生 TS 类型剥离 + node:module registerHooks 解析 '@/' 与 UI 桩；
// SFC 仍由 vue/compiler-sfc 真实编译后以 data: URL 模块求值，'vue' 统一解析到同一 ESM 入口，
// 保证脚本创建的 reactive/watch 与被测代码共享同一套响应式系统。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, compileScript } from 'vue/compiler-sfc';
import { transformWithEsbuild } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcRoot = path.join(root, 'src');
const vueUrl = import.meta.resolve('vue');
const { createRenderer, defineComponent, reactive } = await import(vueUrl);
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

// ---------------- UI / 网络桩（data: URL 模块，与本仓库其余 verify 脚本一致） ----------------
const moduleStub = (code) => 'data:text/javascript,' + encodeURIComponent(code);

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

const naiveUiStub = moduleStub(
  [
    'export const useMessage = () => globalThis.__msg;',
    'export const NButton = {};',
    'export const NTag = {};',
    'export const NSpace = {};',
    'export const NTooltip = {};',
    'export const NPopconfirm = {};',
  ].join('\n'),
);
const vueRouterStub = moduleStub(
  'export const useRouter = () => globalThis.__router;\nexport const useRoute = () => globalThis.__route;',
);
const viconsStub = moduleStub(
  [
    'export const CaretUpOutline = {};',
    'export const CaretDownOutline = {};',
    'export const ChatboxOutline = {};',
  ].join('\n'),
);
// 页面只做 setup 行为测试，不渲染模板；子组件导入用桩满足模块求值即可
const answerItemStub = moduleStub('export default {};');

// 只桩掉被测模块直接依赖的 api 函数；未赋值的调用会抛 TypeError，避免“假通过”
const API_STUB_NAMES = [
  'addFavorite',
  'changeUserPassword',
  'checkProblem',
  'checkFavorite',
  'createAdminTraining',
  'createDiscussionAnswer',
  'createDiscussionComment',
  'deleteAdminTraining',
  'getAdminTrainingDetail',
  'getAdminTrainings',
  'getClasses',
  'getColleges',
  'getDiscussionDetail',
  'getFeaturedContest',
  'getGrades',
  'getJudgeOutbox',
  'getMyProfileChangeRequests',
  'getProfile',
  'getRelatedDiscussions',
  'getSystemTime',
  'removeFavorite',
  'retryJudgeOutbox',
  'submitProfileChangeRequest',
  'updateAdminTraining',
  'updateAdminTrainingStatus',
  'updateUserProfile',
  'voteDiscussion',
];
const apiStub = moduleStub(
  API_STUB_NAMES.map(
    (name) => `export const ${name} = (...args) => globalThis.__api.${name}(...args);`,
  ).join('\n'),
);

registerHooks({
  resolve(specifier, context, next) {
    // 'vue' 与脚本顶部静态导入共用同一 ESM 入口，保证真实响应式单例
    if (specifier === 'vue') return { url: vueUrl, shortCircuit: true };
    if (specifier === '@/utils/api') return { url: apiStub, shortCircuit: true };
    if (specifier === 'naive-ui') return { url: naiveUiStub, shortCircuit: true };
    if (specifier === 'vue-router') return { url: vueRouterStub, shortCircuit: true };
    if (specifier === '@vicons/ionicons5') return { url: viconsStub, shortCircuit: true };
    // 编译后的 SFC 以 data: URL 求值，无法解析相对路径：子组件走既有桩
    if (specifier === './components/DiscussAnswerItem.vue') {
      return { url: answerItemStub, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      let target = path.join(srcRoot, specifier.slice(2));
      if (!path.extname(target)) target += '.ts';
      return next(pathToFileURL(target).href, context);
    }
    return next(specifier, context);
  },
});

const importTs = (relativePath) => import(pathToFileURL(path.join(srcRoot, relativePath)).href);

// 真实编译 SFC <script setup>，再以 data: URL 模块求值（模块内 import 走同一 registerHooks/同一 vue 实例）
async function compileSfcModule(relativePath, id) {
  const file = path.join(srcRoot, relativePath);
  const source = fs.readFileSync(file, 'utf-8');
  const { descriptor, errors } = parse(source);
  if (errors.length) throw new Error(`${relativePath} 解析失败：${errors[0].message}`);
  const compiled = compileScript(descriptor, { id });
  const { code } = await transformWithEsbuild(compiled.content, `${id}.ts`, { loader: 'ts' });
  return import(`data:text/javascript,${encodeURIComponent(code)}`);
}
const sfcModules = new Map();
function loadSfcModule(relativePath, id) {
  if (!sfcModules.has(relativePath)) {
    sfcModules.set(relativePath, compileSfcModule(relativePath, id));
  }
  return sfcModules.get(relativePath);
}

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
  const { useUserSettings } = await importTs('composables/oj/useUserSettings.ts');
  const state = useUserSettings();

  globalThis.__api.getProfile = async () => ({
    uid: 'A',
    username: 'account-A',
    email: 'a@example.com',
    phone: '13800000000',
    cf_username: 'cf-A',
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
    cf_username: 'cf-A',
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
    cf_username: 'cf-B',
  });
  await state.loadProfile();
  assert.equal(state.profile.phone, '13900000000');
  assert.equal(state.profile.cfUsername, 'cf-B');
});

// ---------------- Status.vue 真实 handleRetry ----------------
async function createStatus() {
  const mod = await loadSfcModule('views/admin/SystemManage/Status.vue', 'status');
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
await test('训练详情：密码不回显，编辑留空保留，新建私有必须设置密码', async () => {
  const source = fs.readFileSync(
    path.join(srcRoot, 'views/admin/TrainingManage/TrainingList/components/TrainingEdit.vue'),
    'utf-8',
  );
  const hint = source.match(/<span class="pwd-hint">([^<]*)<\/span>/)?.[1] ?? '';
  assert.ok(hint.length > 0, '应保留密码提示');
  assert.ok(hint.includes('不回显'), '后端详情不返回密码，提示必须说明密码不回显');
  assert.ok(!hint.includes('带入'), '提示不得再声称详情会带入当前密码');
  assert.ok(hint.includes('留空提交即保留原密码'), '提示应说明空值提交保留原密码');
  assert.ok(hint.includes('填写新值则更新'), '提示应说明填写新值才会更新密码');

  const { useTrainingForm } = await importTs('composables/admin/useTrainingManage.ts');
  const saved = [];
  // 后端 TrainingAdminServiceImpl.getTrainingDetail 恒以 privatePwd=null 响应
  globalThis.__api.getAdminTrainingDetail = async () => ({
    id: 5,
    title: '私有题单',
    type: 'Official',
    auth: 'Private',
    privatePwd: null,
    description: '真实描述',
    status: true,
    rank: 0,
    problems: [{ problemId: 11, displayId: 1 }],
  });
  globalThis.__api.checkProblem = async (problemId) => ({
    exists: true,
    problemId,
    problemCode: `P${problemId}`,
    title: `T${problemId}`,
  });
  globalThis.__api.updateAdminTraining = async (id, payload) => {
    saved.push({ id, payload });
    return null;
  };
  globalThis.__api.createAdminTraining = async (payload) => {
    saved.push({ id: null, payload });
    return null;
  };

  const state = useTrainingForm();
  await state.loadData(5);
  assert.equal(state.formValue.privatePwd, '', '详情 privatePwd=null 必须回填为空串');
  assert.equal(state.formValue.description, '真实描述');
  assert.deepEqual(
    state.formValue.problems.map((p) => p.displayId),
    [1],
  );

  // 仅改标题：privatePwd 必须传 null，由后端保留原密码
  state.formValue.title = '只改标题';
  await state.handleSubmit(true, 5);
  assert.equal(saved.length, 1, '应发送一次保存');
  assert.equal(saved[0].payload.privatePwd, null, '空密码必须传 null 由后端保留原密码');
  assert.equal(saved[0].payload.description, '真实描述', '仅改标题不得丢失 description');

  // 填写新值：按新密码提交
  state.formValue.privatePwd = 'new-pwd';
  await state.handleSubmit(true, 5);
  assert.equal(saved.length, 2, '填写新密码应发送保存');
  assert.equal(saved[1].payload.privatePwd, 'new-pwd', '填写新值必须提交新密码');

  // 新建私有题单：密码为空必须阻止且不发请求
  const addState = useTrainingForm();
  addState.formValue.title = '新建私有题单';
  addState.formValue.auth = 'Private';
  await addState.handleSubmit(false);
  assert.equal(saved.length, 2, '新建私有题单无密码不得发送请求');
  assert.equal(messages.at(-1)?.type, 'warning');
  assert.equal(messages.at(-1)?.value, '私有题单必须设置访问密码');
});

// ---------------- 资料 wire 契约：响应 cf_username / 申请 cfUsername ----------------
await test('资料：响应 cf_username 回填，同值不构成变更，不同值按 cfUsername 提交申请', async () => {
  const { useUserSettings } = await importTs('composables/oj/useUserSettings.ts');
  const state = useUserSettings();
  // 与后端 UserProfileVo 的 Jackson 序列化一致（profile-wire-baseline）：CF 用户名字段为 cf_username
  globalThis.__api.getProfile = async () => ({
    uid: 'U1',
    username: 'alice',
    email: 'a@example.com',
    phone: '13800000000',
    avatar: null,
    qq: '123456',
    grade: null,
    realname: '张三',
    github: null,
    blog: null,
    roles: null,
    college: null,
    collegeId: null,
    classId: null,
    cf_username: 'existing-cf',
    class: null,
  });
  await state.loadProfile();
  assert.equal(state.profile.cfUsername, 'existing-cf', '必须读取响应中的 cf_username');

  const submitted = [];
  globalThis.__api.submitProfileChangeRequest = async (payload) => {
    submitted.push(payload);
    return null;
  };
  globalThis.__api.getMyProfileChangeRequests = async () => ({ list: [], total: 0 });

  // 与当前资料同值：不构成 changedProfileFields，不得向后端发送空申请
  state.identity.cfUsername = 'existing-cf';
  state.identity.reason = '确认 CF 用户名';
  assert.equal(await state.submitIdentity(), false, '无字段变更必须拒绝提交');
  assert.equal(submitted.length, 0, '同值 cf_username 不得发送资料变更申请');
  assert.equal(messages.at(-1)?.type, 'warning');

  // 不同值：申请请求体仍按后端 ProfileChangeCreateRequest 使用 camelCase cfUsername
  state.identity.cfUsername = 'new-cf';
  assert.equal(await state.submitIdentity(), true, '真实变更应提交成功');
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].cfUsername, 'new-cf', '申请体必须使用 cfUsername');
  assert.equal(
    Object.prototype.hasOwnProperty.call(submitted[0], 'cf_username'),
    false,
    '申请体不得出现响应侧 snake_case',
  );
  assert.equal(submitted[0].reason, '确认 CF 用户名');
});

// ---------------- UserDetailVo 真实 cf_username 与 UserList 消费 ----------------
await test('用户详情：类型与消费使用后端真实 cf_username', () => {
  const apiSource = fs.readFileSync(path.join(srcRoot, 'utils/api.ts'), 'utf-8');
  const start = apiSource.indexOf('export interface UserDetailVo');
  const end = apiSource.indexOf('export interface UserAchievementVo');
  assert.ok(start >= 0 && end > start, '应能定位 UserDetailVo');
  const userDetailVo = apiSource.slice(start, end);
  assert.match(userDetailVo, /cf_username: string \| null/, 'UserDetailVo 应声明 cf_username');
  assert.ok(!/cfUsername/.test(userDetailVo), 'UserDetailVo 不得声明 camelCase cfUsername');

  const userListSource = fs.readFileSync(
    path.join(srcRoot, 'views/admin/UserManage/UserList.vue'),
    'utf-8',
  );
  assert.match(userListSource, /detail\.cf_username/, 'UserList 详情应读取 detail.cf_username');
  assert.ok(!/detail\.cfUsername/.test(userListSource), 'UserList 不得再读 camelCase 字段');
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

  const { useDiscussDetail, CATEGORY_LABEL } = await importTs('composables/oj/useDiscussDetail.ts');
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
const { useContestMode, formatSystemTime } = await importTs('composables/admin/useContestMode.ts');

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

// ---------------- 陈旧写入回调：useDiscussDetail 真实 composable ----------------
const POST_A = '1';
const POST_B = '2';
const ANSWER_A = 101;
const ANSWER_B = 202;
const discussDetailVo = (id) => ({
  post: {
    id: Number(id),
    title: `post-${id}`,
    content: 'body',
    uid: 'u1',
    author: 'alice',
    category: 'Problem',
    problemCode: null,
    viewNum: 0,
    likeNum: 0,
    gmtCreate: null,
  },
  answers: [
    {
      id: String(id) === POST_A ? ANSWER_A : ANSWER_B,
      uid: 'u1',
      author: 'alice',
      content: `answer-${id}`,
      gmtCreate: null,
      likeNum: 0,
      comments: [],
    },
  ],
});

await test('回答写入在途切到 B：旧写入完成不刷新 A，也不作废 B 的请求', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  const calls = [];
  const write = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionAnswer = (id, content) => {
    calls.push(`POST:${id}:${content}`);
    return write.promise;
  };

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const posting = state.submitAnswer('answer-A');
  await tick();
  const loadingB = state.fetchDetail(POST_B);
  await tick();
  assert.deepEqual(
    calls,
    [`GET:${POST_A}`, `POST:${POST_A}:answer-A`, `GET:${POST_B}`],
    '写入与 B 请求都应已发出',
  );

  write.resolve({});
  assert.equal(await posting, true, '写入成功仍返回 true');
  assert.deepEqual(
    calls,
    [`GET:${POST_A}`, `POST:${POST_A}:answer-A`, `GET:${POST_B}`],
    '旧写入完成不得再请求 A，也不得第二次请求 B',
  );

  bGate.resolve(discussDetailVo(POST_B));
  assert.equal(await loadingB, true, 'B 的请求不得被旧写入作废');
  assert.equal(state.post.value.id, POST_B, 'B 加载完成后 post 应为 B');
  assert.equal(state.error.value, null);
});

await test('B 已加载后旧回答写入成功：不得刷新当前 B', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  const calls = [];
  const write = deferred();
  globalThis.__api.getDiscussionDetail = async (id) => {
    calls.push(`GET:${id}`);
    return discussDetailVo(id);
  };
  globalThis.__api.createDiscussionAnswer = (id, content) => {
    calls.push(`POST:${id}:${content}`);
    return write.promise;
  };

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const posting = state.submitAnswer('answer-A');
  await tick();
  await state.fetchDetail(POST_B);
  assert.equal(state.post.value.id, POST_B);

  const before = calls.length;
  write.resolve({});
  assert.equal(await posting, true);
  assert.equal(calls.length, before, 'B 已加载后旧写入完成不得再刷新 B');
  assert.equal(state.post.value.id, POST_B);
});

await test('回答写入在途走完 A->B->A：旧写入完成不得刷新新世代 A', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  const calls = [];
  const write = deferred();
  globalThis.__api.getDiscussionDetail = async (id) => {
    calls.push(`GET:${id}`);
    return discussDetailVo(id);
  };
  globalThis.__api.createDiscussionAnswer = (id, content) => {
    calls.push(`POST:${id}:${content}`);
    return write.promise;
  };

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const posting = state.submitAnswer('answer-A');
  await tick();
  await state.fetchDetail(POST_B);
  await state.fetchDetail(POST_A);
  assert.equal(state.post.value.id, POST_A, '应已加载新世代 A');

  const before = calls.length;
  write.resolve({});
  assert.equal(await posting, true);
  assert.equal(calls.length, before, '旧写入完成不得刷新新世代 A');
  assert.equal(state.post.value.id, POST_A);
});

await test('回答写入在途切到 B 后失败：不污染新路由错误也不触发刷新', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  const calls = [];
  const write = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionAnswer = (id, content) => {
    calls.push(`POST:${id}:${content}`);
    return write.promise;
  };

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const posting = state.submitAnswer('answer-A');
  await tick();
  const loadingB = state.fetchDetail(POST_B);
  await tick();
  const before = calls.length;

  write.reject(new Error('network down'));
  assert.equal(await posting, false, '写入失败返回 false 供页面保留草稿');
  assert.equal(state.error.value, null, '旧写入失败不得污染新路由错误');
  assert.equal(calls.length, before, '写入失败不得触发刷新');
  assert.equal(messages.at(-1)?.type, 'error');
  assert.equal(messages.at(-1)?.value, 'network down');

  bGate.resolve(discussDetailVo(POST_B));
  await loadingB;
  assert.equal(state.post.value.id, POST_B);
  assert.equal(state.error.value, null, 'B 加载后错误仍应为空');
});

await test('评论写入在途切到 B：仍发往原 A 的回答 id，完成后不刷新 A 也不重复请求 B', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  const calls = [];
  const write = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionComment = (answerId, content) => {
    calls.push(`POST:${answerId}:${content}`);
    return write.promise;
  };

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const posting = state.submitComment(ANSWER_A, 'comment-A');
  await tick();
  const loadingB = state.fetchDetail(POST_B);
  await tick();
  assert.deepEqual(
    calls,
    [`GET:${POST_A}`, `POST:${ANSWER_A}:comment-A`, `GET:${POST_B}`],
    '评论必须发往原 A 的回答 id',
  );

  write.resolve({});
  assert.equal(await posting, true);
  assert.deepEqual(
    calls,
    [`GET:${POST_A}`, `POST:${ANSWER_A}:comment-A`, `GET:${POST_B}`],
    '旧评论完成不得刷新 A 或再次请求 B',
  );

  bGate.resolve(discussDetailVo(POST_B));
  await loadingB;
  assert.equal(state.post.value.id, POST_B);
});

await test('B 已加载后旧评论写入成功：不得刷新当前 B', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  const calls = [];
  const write = deferred();
  globalThis.__api.getDiscussionDetail = async (id) => {
    calls.push(`GET:${id}`);
    return discussDetailVo(id);
  };
  globalThis.__api.createDiscussionComment = (answerId, content) => {
    calls.push(`POST:${answerId}:${content}`);
    return write.promise;
  };

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const posting = state.submitComment(ANSWER_A, 'comment-A');
  await tick();
  await state.fetchDetail(POST_B);
  const before = calls.length;

  write.resolve({});
  assert.equal(await posting, true);
  assert.equal(calls.length, before, 'B 已加载后旧评论完成不得再刷新 B');
  assert.equal(state.post.value.id, POST_B);
});

await test('评论写入在途走完 A->B->A：旧评论完成不得刷新新世代 A', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  const calls = [];
  const write = deferred();
  globalThis.__api.getDiscussionDetail = async (id) => {
    calls.push(`GET:${id}`);
    return discussDetailVo(id);
  };
  globalThis.__api.createDiscussionComment = (answerId, content) => {
    calls.push(`POST:${answerId}:${content}`);
    return write.promise;
  };

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const posting = state.submitComment(ANSWER_A, 'comment-A');
  await tick();
  await state.fetchDetail(POST_B);
  await state.fetchDetail(POST_A);
  assert.equal(state.post.value.id, POST_A, '应已加载新世代 A');

  const before = calls.length;
  write.resolve({});
  assert.equal(await posting, true, '写入成功仍返回 true');
  assert.equal(calls.length, before, '旧评论完成不得刷新新世代 A');
  assert.equal(state.post.value.id, POST_A);
});

await test('写入成功但刷新失败：仍返回 true，保留旧详情并暴露可重试错误', async () => {
  const { useDiscussDetail } = await importTs('composables/oj/useDiscussDetail.ts');
  let detailCalls = 0;
  globalThis.__api.getDiscussionDetail = async () => {
    detailCalls += 1;
    if (detailCalls === 1) return discussDetailVo(POST_A);
    throw new Error('refresh failed');
  };
  globalThis.__api.createDiscussionAnswer = async () => ({});

  const state = useDiscussDetail();
  await state.fetchDetail(POST_A);
  const ok = await state.submitAnswer('answer-A');
  assert.equal(detailCalls, 2, '写入成功后应刷新详情');
  assert.equal(ok, true, '刷新失败不得当成写入失败');
  assert.equal(state.post.value?.id, POST_A, '刷新失败应保留最后一次已知详情');
  assert.equal(state.error.value, 'refresh failed', '刷新失败应暴露可重试错误');
});

// ---------------- 陈旧写入回调：真实 DiscussDetail.vue setup ----------------
const loadDiscussDetailComponent = () =>
  loadSfcModule('views/oj/DiscussPage/DiscussDetail.vue', 'discuss-detail');
const loadDiscussCommentsComponent = () =>
  loadSfcModule('views/oj/DiscussPage/components/DiscussComments.vue', 'discuss-comments');

async function createDiscussDetailPage(routeId) {
  const mod = await loadDiscussDetailComponent();
  // 每个用例使用全新的 reactive route：旧用例留下的 watch 不会被再次触发
  globalThis.__route = reactive({ params: { id: String(routeId) }, query: {} });
  // setup 在组件实例外调用：屏蔽 onMounted 的实例告警，其余行为保持真实
  const originalWarn = console.warn;
  console.warn = () => {};
  let bindings;
  try {
    bindings = mod.default.setup({}, { expose() {} });
  } finally {
    console.warn = originalWarn;
  }
  // onMounted 在实例外不会执行：手动模拟首屏路由加载
  await bindings.loadByRoute(String(routeId));
  return bindings;
}

await test('页面回答：A 提交在途切到 B，A 成功后不清 B 草稿且 B 详情仍生效', async () => {
  const calls = [];
  const answerGate = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionAnswer = (id, content) => {
    calls.push(`POST:${id}:${content}`);
    return answerGate.promise;
  };

  const page = await createDiscussDetailPage(POST_A);
  assert.equal(page.post.value.id, POST_A);
  page.answerDraft.value = 'draft-A';
  const posting = page.handlePostAnswer();
  await tick();
  assert.deepEqual(calls, [`GET:${POST_A}`, `POST:${POST_A}:draft-A`]);

  // 路由切到 B：watch 触发 loadByRoute(B)，B 请求保持挂起
  globalThis.__route.params.id = POST_B;
  await tick();
  await tick();
  assert.deepEqual(calls, [`GET:${POST_A}`, `POST:${POST_A}:draft-A`, `GET:${POST_B}`]);
  page.answerDraft.value = 'draft-B';

  answerGate.resolve({});
  await posting;
  await tick();
  assert.equal(page.answerDraft.value, 'draft-B', 'A 的旧写入完成不得清空 B 的草稿');
  assert.deepEqual(
    calls,
    [`GET:${POST_A}`, `POST:${POST_A}:draft-A`, `GET:${POST_B}`],
    '旧写入完成不得刷新 A 或再次请求 B',
  );

  bGate.resolve(discussDetailVo(POST_B));
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_B, 'B 的响应仍应生效');
});

await test('页面回答：A->B->A 后旧提交完成不得清空新世代草稿', async () => {
  const calls = [];
  const answerGate = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionAnswer = (id, content) => {
    calls.push(`POST:${id}:${content}`);
    return answerGate.promise;
  };

  const page = await createDiscussDetailPage(POST_A);
  page.answerDraft.value = 'draft-A';
  const posting = page.handlePostAnswer();
  await tick();

  globalThis.__route.params.id = POST_B;
  await tick();
  await tick();
  bGate.resolve(discussDetailVo(POST_B));
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_B);

  globalThis.__route.params.id = POST_A;
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_A, '回到 A 应加载新世代 A');
  page.answerDraft.value = 'draft-A2';
  const before = calls.length;

  answerGate.resolve({});
  await posting;
  await tick();
  assert.equal(page.answerDraft.value, 'draft-A2', 'A->B->A 后旧写入完成不得清空新草稿');
  assert.equal(calls.length, before, '旧写入完成不得刷新新世代 A');
  assert.equal(page.post.value.id, POST_A);
});

await test('页面回答：A 提交失败不清 B 草稿也不污染 B 错误', async () => {
  const calls = [];
  const answerGate = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionAnswer = (id, content) => {
    calls.push(`POST:${id}:${content}`);
    return answerGate.promise;
  };

  const page = await createDiscussDetailPage(POST_A);
  page.answerDraft.value = 'draft-A';
  const posting = page.handlePostAnswer();
  await tick();

  globalThis.__route.params.id = POST_B;
  await tick();
  await tick();
  page.answerDraft.value = 'draft-B';

  answerGate.reject(new Error('network down'));
  await posting;
  await tick();
  assert.equal(page.answerDraft.value, 'draft-B', 'A 的旧写入失败不得清空 B 的草稿');
  assert.equal(page.error.value, null, 'A 的旧写入失败不得污染 B 的错误状态');
  assert.deepEqual(
    calls,
    [`GET:${POST_A}`, `POST:${POST_A}:draft-A`, `GET:${POST_B}`],
    '写入失败不得触发刷新',
  );

  bGate.resolve(discussDetailVo(POST_B));
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_B);
  assert.equal(page.error.value, null);
});

await test('页面回答：同路由成功清空草稿、失败保留；B 加载中不得把回答写到 A', async () => {
  const calls = [];
  const attempts = [];
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionAnswer = async (id, content) => {
    attempts.push({ id, content });
    return {};
  };

  const page = await createDiscussDetailPage(POST_A);
  page.answerDraft.value = 'ok-draft';
  await page.handlePostAnswer();
  assert.equal(page.answerDraft.value, '', '同路由写入成功应清空草稿');
  assert.deepEqual(attempts, [{ id: POST_A, content: 'ok-draft' }]);
  assert.equal(
    calls.filter((call) => call === `GET:${POST_A}`).length,
    2,
    '写入成功后应刷新同路由详情',
  );

  globalThis.__api.createDiscussionAnswer = async (id, content) => {
    attempts.push({ id, content });
    throw new Error('boom');
  };
  page.answerDraft.value = 'retry-draft';
  await page.handlePostAnswer();
  assert.equal(page.answerDraft.value, 'retry-draft', '写入失败应保留草稿');
  assert.equal(attempts.length, 2, '失败也应真实尝试过一次写入');

  // B 加载中（post 仍 A）时不得把回答提交到 A
  globalThis.__route.params.id = POST_B;
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_A, 'B 未返回前仍显示 A');
  page.answerDraft.value = 'draft-B';
  await page.handlePostAnswer();
  assert.equal(attempts.length, 2, 'B 加载中不得把回答写到 A');
  assert.equal(page.answerDraft.value, 'draft-B');

  bGate.resolve(discussDetailVo(POST_B));
  await tick();
  await tick();
});

await test('页面评论：A 提交在途切到 B，旧评论完成不关闭新路由编辑框，当前世代成功仍清空并关闭', async () => {
  const calls = [];
  const posts = [];
  const commentGate = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionComment = (answerId, content) => {
    posts.push({ answerId, content });
    return commentGate.promise;
  };

  const page = await createDiscussDetailPage(POST_A);
  const commentsMod = await loadDiscussCommentsComponent();
  const events = [];
  const editor = commentsMod.default.setup(
    {
      comments: [],
      visible: true,
      initialText: '',
      // 与 DiscussAnswerItem 的真实绑定一致：子组件只传文本，回答 id 由页面闭包补齐
      submitComment: (text) => page.submitCommentForRoute(ANSWER_A, text),
    },
    { expose() {}, emit: (e) => events.push(e) },
  );
  editor.inputValue.value = 'comment-A';
  const submitting = editor.handleSubmit();
  await tick();
  assert.deepEqual(
    posts,
    [{ answerId: ANSWER_A, content: 'comment-A' }],
    '评论必须带原 A 的回答 id 与真实文本',
  );

  globalThis.__route.params.id = POST_B;
  await tick();
  await tick();
  assert.deepEqual(calls, [`GET:${POST_A}`, `GET:${POST_B}`]);

  // 用户在 B 的编辑框里真正输入新草稿，随后 A 的旧评论才完成
  editor.inputValue.value = 'comment-B';
  commentGate.resolve({});
  await submitting;
  await tick();
  assert.equal(editor.inputValue.value, 'comment-B', 'A 的旧评论完成不得清空 B 的草稿');
  assert.equal(events.includes('close'), false, 'A 的旧评论完成不得关闭 B 的编辑框');
  assert.deepEqual(
    calls,
    [`GET:${POST_A}`, `GET:${POST_B}`],
    '旧评论完成不得刷新 A 或再次请求 B',
  );

  bGate.resolve(discussDetailVo(POST_B));
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_B, 'B 的响应仍应生效');
  globalThis.__route.params.id = POST_A;
  await tick();
  await tick();

  // 当前世代下正常评论成功：返回 true，编辑框清空并关闭
  globalThis.__api.createDiscussionComment = async (answerId, content) => {
    posts.push({ answerId, content });
    return {};
  };
  editor.inputValue.value = 'comment-current';
  await editor.handleSubmit();
  assert.deepEqual(
    posts.at(-1),
    { answerId: ANSWER_A, content: 'comment-current' },
    '当前世代评论应带真实文本发往当前回答',
  );
  assert.equal(editor.inputValue.value, '', '当前世代评论成功应清空草稿');
  assert.ok(events.includes('close'), '当前世代评论成功应关闭编辑框');
});

await test('页面评论：B 加载中仍显示 A 时提交评论不得写到 A，B 响应仍生效', async () => {
  const calls = [];
  const posts = [];
  const commentGate = deferred();
  const bGate = deferred();
  globalThis.__api.getDiscussionDetail = (id) => {
    calls.push(`GET:${id}`);
    if (String(id) === POST_B) return bGate.promise;
    return Promise.resolve(discussDetailVo(id));
  };
  globalThis.__api.createDiscussionComment = (answerId, content) => {
    posts.push({ answerId, content });
    return commentGate.promise;
  };

  const page = await createDiscussDetailPage(POST_A);
  const commentsMod = await loadDiscussCommentsComponent();
  const events = [];
  const editor = commentsMod.default.setup(
    {
      comments: [],
      visible: true,
      initialText: '',
      // 与 DiscussAnswerItem 的真实绑定一致：子组件只传文本，回答 id 由页面闭包补齐
      submitComment: (text) => page.submitCommentForRoute(ANSWER_A, text),
    },
    { expose() {}, emit: (e) => events.push(e) },
  );

  globalThis.__route.params.id = POST_B;
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_A, 'B 未返回前页面仍显示 A');
  assert.deepEqual(calls, [`GET:${POST_A}`, `GET:${POST_B}`]);

  editor.inputValue.value = 'comment-for-B';
  const submitting = editor.handleSubmit();
  await tick();
  assert.deepEqual(posts, [], 'B 加载中不得把评论写到 A 的旧回答');

  // 即便真的发出了 POST，也不得因此刷新 A 而作废在途的 B
  commentGate.resolve({});
  await submitting;
  await tick();
  assert.deepEqual(calls, [`GET:${POST_A}`, `GET:${POST_B}`], '不得因评论完成刷新 A 而作废 B');
  assert.equal(editor.inputValue.value, 'comment-for-B', '草稿必须保留供用户在 B 上重试');
  assert.equal(events.includes('close'), false, '未写入不得关闭编辑框');

  bGate.resolve(discussDetailVo(POST_B));
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_B, 'B 的响应仍应生效');
  assert.equal(page.error.value, null);
});

await test('页面评论：A->B->A 后旧评论完成不刷新新世代 A，也不清新草稿', async () => {
  const calls = [];
  const posts = [];
  const commentGate = deferred();
  globalThis.__api.getDiscussionDetail = async (id) => {
    calls.push(`GET:${id}`);
    return discussDetailVo(id);
  };
  globalThis.__api.createDiscussionComment = (answerId, content) => {
    posts.push({ answerId, content });
    return commentGate.promise;
  };

  const page = await createDiscussDetailPage(POST_A);
  const commentsMod = await loadDiscussCommentsComponent();
  const events = [];
  const editor = commentsMod.default.setup(
    {
      comments: [],
      visible: true,
      initialText: '',
      // 与 DiscussAnswerItem 的真实绑定一致：子组件只传文本，回答 id 由页面闭包补齐
      submitComment: (text) => page.submitCommentForRoute(ANSWER_A, text),
    },
    { expose() {}, emit: (e) => events.push(e) },
  );
  editor.inputValue.value = 'comment-A';
  const submitting = editor.handleSubmit();
  await tick();
  assert.deepEqual(posts, [{ answerId: ANSWER_A, content: 'comment-A' }]);

  globalThis.__route.params.id = POST_B;
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_B, 'B 应加载完成');
  globalThis.__route.params.id = POST_A;
  await tick();
  await tick();
  assert.equal(page.post.value.id, POST_A, '回到 A 应加载新世代 A');

  editor.inputValue.value = 'comment-A2';
  const before = calls.length;
  commentGate.resolve({});
  await submitting;
  await tick();
  assert.equal(editor.inputValue.value, 'comment-A2', '旧评论完成不得清空新世代的草稿');
  assert.equal(events.includes('close'), false, '旧评论完成不得关闭新世代编辑框');
  assert.equal(calls.length, before, '旧评论完成不得刷新新世代 A');
  assert.equal(page.post.value.id, POST_A);

  // 当前世代下正常评论成功：清空草稿并关闭编辑框
  globalThis.__api.createDiscussionComment = async (answerId, content) => {
    posts.push({ answerId, content });
    return {};
  };
  editor.inputValue.value = 'comment-current';
  await editor.handleSubmit();
  assert.deepEqual(posts.at(-1), { answerId: ANSWER_A, content: 'comment-current' });
  assert.equal(editor.inputValue.value, '', '当前世代评论成功应清空草稿');
  assert.ok(events.includes('close'), '当前世代评论成功应关闭编辑框');
});

console.log(failures ? `\n${failures} checks FAILED` : '\nall review-rework behavior checks passed');
process.exitCode = failures ? 1 : 0;
