// OJ 返修行为回归：真实调用 useDiscussDetail / useDiscussAdd / useTrainingProblems /
// useHomeworkList / useRejudge / useStatusTime，验证
//  - R1 回答/评论互斥覆盖“写入 + 刷新”，失败保留可重试且不产生重复写入
//  - R5 发帖互斥覆盖校验/查题/创建，并发双击只发一次 POST
//  - R8 题单/作业分页旧响应不得覆盖新查询
//  - business-R6 重判变化数不伪造 processedCount
//  - ContestItem 使用 getter 后时间状态可随 props 变化重算
// 运行：node scripts/verify-oj-rework.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parse, compileScript } from 'vue/compiler-sfc';
import { transformWithEsbuild } from 'vite';

const root = process.cwd();
const req = createRequire(root + '/package.json');
globalThis.__vue = req('vue');
globalThis.__vueReactive = globalThis.__vue.reactive;
const vueEntryUrl = import.meta.resolve('vue');

globalThis.__message = { success() {}, error() {}, warning() {}, info() {} };
globalThis.__routerCalls = [];
globalThis.__route = { query: {}, params: {} };

const moduleStub = (code) => 'data:text/javascript,' + encodeURIComponent(code);

// @/utils/api：所有被消费的函数转发到 globalThis.__api，便于逐用例替换
const apiStub = moduleStub(`
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
globalThis.__ApiError = ApiError;
const call = (name, args) => globalThis.__api[name](...args);
export const createDiscussion = (...a) => call('createDiscussion', a);
export const createDiscussionAnswer = (...a) => call('createDiscussionAnswer', a);
export const createDiscussionComment = (...a) => call('createDiscussionComment', a);
export const getDiscussionDetail = (...a) => call('getDiscussionDetail', a);
export const voteDiscussion = (...a) => call('voteDiscussion', a);
export const getProblemDetail = (...a) => call('getProblemDetail', a);
export const getTrainings = (...a) => call('getTrainings', a);
export const getTrainingProblems = (...a) => call('getTrainingProblems', a);
export const checkProblem = (...a) => call('checkProblem', a);
export const getHomeworks = (...a) => call('getHomeworks', a);
export const getSubmissions = (...a) => call('getSubmissions', a);
export const get = (...a) => call('get', a);
export const post = (...a) => call('post', a);
export const submitAchievementApply = (...a) => call('submitAchievementApply', a);
export const changeUserPassword = (...a) => call('changeUserPassword', a);
export const getClasses = (...a) => call('getClasses', a);
export const getColleges = (...a) => call('getColleges', a);
export const getGrades = (...a) => call('getGrades', a);
export const getMyProfileChangeRequests = (...a) => call('getMyProfileChangeRequests', a);
export const getProfile = (...a) => call('getProfile', a);
export const submitProfileChangeRequest = (...a) => call('submitProfileChangeRequest', a);
export const updateUserProfile = (...a) => call('updateUserProfile', a);
// 资料变更申请的字段清单（UserSetting.vue 在模块初始化时读取，因此不能走 __api 转发）。
// 它必须与 src/utils/api.ts 的真实导出一致：下方有断言逐一比对 key/label，防止桩漂移。
export const PROFILE_CHANGE_FIELDS = [
  { key: 'realname', label: '实名' },
  { key: 'collegeId', label: '学院' },
  { key: 'grade', label: '年级' },
  { key: 'classId', label: '班级' },
  { key: 'username', label: '用户名' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机号' },
  { key: 'avatar', label: '头像' },
  { key: 'qq', label: 'QQ' },
  { key: 'cfUsername', label: 'Codeforces' },
  { key: 'github', label: 'GitHub' },
  { key: 'blog', label: '博客' },
];
`);

const messageStub = moduleStub('export const useMessage = () => globalThis.__message;');

const routerStub = moduleStub(`
export const useRouter = () => ({
  push: (...args) => globalThis.__routerCalls.push(args),
  replace: (...args) => globalThis.__routerCalls.push(args),
  back() {},
});
export const useRoute = () => {
  if (!globalThis.__routeRef) {
    globalThis.__routeRef = globalThis.__vueReactive(globalThis.__route);
  }
  return globalThis.__routeRef;
};
`);

const storeStub = moduleStub(
  'export const useUserStore = () => ({ isAdmin: false, userInfo: { id: "" }, loadProfile: async () => {}, logout: () => {} });',
);

// 仅组件脚本测试需要的图标桩（不渲染模板）
const viconsStub = moduleStub(
  'export const ChatboxOutline = {}; export const CaretUpOutline = {}; export const CaretDownOutline = {};',
);

registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith('data:')) {
      if (specifier === 'vue') return { url: vueEntryUrl, shortCircuit: true };
    }
    if (specifier === '@/utils/api') return { url: apiStub, shortCircuit: true };
    if (specifier === 'naive-ui') return { url: messageStub, shortCircuit: true };
    if (specifier === 'vue-router') return { url: routerStub, shortCircuit: true };
    if (specifier === '@/stores/userStore') return { url: storeStub, shortCircuit: true };
    if (specifier === '@vicons/ionicons5') return { url: viconsStub, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      return next(pathToFileURL(path.join(root, 'src', specifier.slice(2) + '.ts')).href, context);
    }
    return next(specifier, context);
  },
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

const { ref } = globalThis.__vue;
const { useDiscussDetail } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useDiscussDetail.ts'))
);
const { useDiscussAdd } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useDiscussAdd.ts'))
);
const { useTrainingProblems } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useTrainingProblems.ts'))
);
const { useHomeworkList } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useHomeworkList.ts'))
);
const { useStatusList } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useStatusList.ts'))
);
const { useRejudge } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useRejudge.ts'))
);
const { useStatusTime } = await import(
  pathToFileURL(path.join(root, 'src/composables/useTime.ts'))
);
// 通过 resolve 钩子拿到的是上面的 api 桩模块（模块级常量无法用 __api 转发）
const { PROFILE_CHANGE_FIELDS } = await import('@/utils/api');

function detailVo() {
  return {
    post: {
      id: 1,
      title: 'post',
      content: 'body',
      uid: 'u1',
      author: 'alice',
      category: 'Problem',
      problemCode: 'P1',
      viewNum: 0,
      likeNum: 0,
      gmtCreate: '2026-09-20T12:00:00',
    },
    answers: [],
  };
}

// 每个用例前重置 API 行为
globalThis.__api = {
  createDiscussion: async () => ({ id: 1 }),
  createDiscussionAnswer: async () => ({}),
  createDiscussionComment: async () => ({}),
  getDiscussionDetail: async () => detailVo(),
  voteDiscussion: async () => ({}),
  getProblemDetail: async () => ({ problemCode: 'P1' }),
  getTrainings: async () => ({ list: [], total: 0 }),
  getTrainingProblems: async () => ({ list: [], total: 0 }),
  checkProblem: async () => ({ problemCode: 'P1', title: 'one' }),
  getHomeworks: async () => ({ list: [], total: 0 }),
  getSubmissions: async () => ({ list: [], total: 0 }),
  get: async () => ({ list: [], total: 0 }),
  post: async () => ({}),
  submitAchievementApply: async () => ({}),
};

// 编译真实的 UserSetting.vue <script setup>，直接调用其返回的绑定验证上传状态行为
// （与 verify-auth.mjs 的 register.vue 组件行为测试同一无依赖方案）。
let userSettingPromise = null;
async function loadUserSettingComponent() {
  if (!userSettingPromise) {
    userSettingPromise = (async () => {
      const source = fs.readFileSync(
        path.join(root, 'src/views/oj/UserPage/views/UserSetting.vue'),
        'utf-8',
      );
      const { descriptor, errors } = parse(source);
      if (errors.length) throw new Error(`UserSetting.vue 解析失败: ${errors[0].message}`);
      const compiled = compileScript(descriptor, { id: 'user-setting' });
      const { code } = await transformWithEsbuild(compiled.content, 'UserSetting.ts', {
        loader: 'ts',
      });
      const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`);
      return mod.default.setup({}, { expose() {} });
    })();
  }
  return userSettingPromise;
}

const makeUpload = (name) => {
  const file = new File(['proof'], name, { type: 'application/pdf' });
  return { id: 'f1', name, status: 'pending', file };
};

// 编译真实的 DiscussComments.vue <script setup>，验证失败保留草稿、成功才清空并关闭
let discussCommentsPromise = null;
async function loadDiscussCommentsComponent() {
  if (!discussCommentsPromise) {
    discussCommentsPromise = (async () => {
      const source = fs.readFileSync(
        path.join(root, 'src/views/oj/DiscussPage/components/DiscussComments.vue'),
        'utf-8',
      );
      const { descriptor, errors } = parse(source);
      if (errors.length) throw new Error(`DiscussComments.vue 解析失败: ${errors[0].message}`);
      const compiled = compileScript(descriptor, { id: 'discuss-comments' });
      const { code } = await transformWithEsbuild(compiled.content, 'DiscussComments.ts', {
        loader: 'ts',
      });
      const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`);
      return mod.default;
    })();
  }
  return discussCommentsPromise;
}

// 编译真实的 HomeworkProblems.vue <script setup>，验证 detail 切换时旧查码响应作废
let homeworkProblemsPromise = null;
async function loadHomeworkProblemsComponent() {
  if (!homeworkProblemsPromise) {
    homeworkProblemsPromise = (async () => {
      const source = fs.readFileSync(
        path.join(root, 'src/views/oj/HomeworkPage/components/HomeworkProblems.vue'),
        'utf-8',
      );
      const { descriptor, errors } = parse(source);
      if (errors.length) throw new Error(`HomeworkProblems.vue 解析失败: ${errors[0].message}`);
      const compiled = compileScript(descriptor, { id: 'homework-problems' });
      const { code } = await transformWithEsbuild(compiled.content, 'HomeworkProblems.ts', {
        loader: 'ts',
      });
      const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`);
      return mod.default;
    })();
  }
  return homeworkProblemsPromise;
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

// 桩自检：PROFILE_CHANGE_FIELDS 是模块级常量（不能像函数那样转发到 __api），
// 必须与 src/utils/api.ts 的真实导出逐项一致，否则用例验证的是一份过期清单。
await check('桩自检：PROFILE_CHANGE_FIELDS 与真实导出一致', async () => {
  const apiSource = fs.readFileSync(path.join(root, 'src/utils/api.ts'), 'utf8');
  const realPairs = [...apiSource.matchAll(/\{ key: '(\w+)', label: '([^']+)' \}/g)]
    .map((match) => `${match[1]}:${match[2]}`);
  const stubPairs = PROFILE_CHANGE_FIELDS.map((field) => `${field.key}:${field.label}`);
  assert.ok(realPairs.length > 0, '未能从 src/utils/api.ts 解析出字段清单');
  assert.deepEqual(stubPairs, realPairs, 'PROFILE_CHANGE_FIELDS 桩已与真实导出漂移');
});

// ---- R1：写入 + 刷新全过程互斥；刷新失败不产生重复写入 ----
await check('R1 回答互斥覆盖刷新：双击只写一次，刷新结束前 flag 保持', async () => {
  const write = deferred();
  const reloadGate = deferred();
  let answerCalls = 0;
  let detailCalls = 0;
  globalThis.__api.createDiscussionAnswer = async () => {
    answerCalls += 1;
    return write.promise;
  };
  globalThis.__api.getDiscussionDetail = async () => {
    detailCalls += 1;
    if (detailCalls > 1) await reloadGate.promise;
    return detailVo();
  };

  const state = useDiscussDetail();
  await state.fetchDetail('1');
  const p1 = state.submitAnswer('hello');
  const p2 = state.submitAnswer('hello');
  assert.equal(answerCalls, 1, '并发双击只允许一次 POST');
  assert.equal(state.submittingAnswer.value, true, '写入期间必须持锁');

  write.resolve({});
  await tick();
  assert.equal(detailCalls, 2, '写入成功后应刷新详情');
  assert.equal(state.submittingAnswer.value, true, '刷新未结束前仍须持锁');

  reloadGate.resolve();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1, true);
  assert.equal(r2, false, '第二次调用应被互斥拒绝');
  assert.equal(state.submittingAnswer.value, false, '全部结束后释放锁');
});

await check('R1 写入失败返回 false、释放锁且不触发刷新', async () => {
  let detailCalls = 0;
  globalThis.__api.getDiscussionDetail = async () => {
    detailCalls += 1;
    return detailVo();
  };
  globalThis.__api.createDiscussionAnswer = async () => {
    throw new Error('网络中断');
  };
  const state = useDiscussDetail();
  await state.fetchDetail('1');
  const ok = await state.submitAnswer('hello');
  assert.equal(ok, false, '写入失败必须返回 false 供 UI 保留草稿');
  assert.equal(state.submittingAnswer.value, false);
  assert.equal(detailCalls, 1, '写入失败不应刷新');
});

await check('R1 评论互斥覆盖刷新且失败不关闭编辑框（返回 false）', async () => {
  let commentCalls = 0;
  globalThis.__api.createDiscussionComment = async () => {
    commentCalls += 1;
    throw new Error('boom');
  };
  const state = useDiscussDetail();
  await state.fetchDetail('1');
  const first = state.submitComment(1, 'c1');
  const second = state.submitComment(1, 'c1');
  const [r1, r2] = await Promise.all([first, second]);
  assert.equal(commentCalls, 1, '并发评论只写一次');
  assert.equal(r1, false);
  assert.equal(r2, false, '写入失败也必须返回 false');
});

// ---- R3：路由 id 变化时旧详情响应必须作废 ----
await check('R3 切换讨论 id 时旧响应不覆盖新帖子', async () => {
  const oldDetail = deferred();
  globalThis.__api.getDiscussionDetail = async (id) => {
    if (String(id) === '1') return oldDetail.promise;
    return {
      post: { ...detailVo().post, id: 2, title: 'second' },
      answers: [],
    };
  };
  const state = useDiscussDetail();
  const first = state.fetchDetail('1');
  const second = state.fetchDetail('2');
  await second;
  assert.equal(state.post.value?.id, '2');
  assert.equal(state.post.value?.title, 'second');
  oldDetail.resolve(detailVo());
  await first;
  assert.equal(state.post.value?.id, '2', '旧 id 的响应不得覆盖新帖子');
});

// ---- R5：发帖互斥覆盖 校验 -> 查题 -> 创建 ----
await check('R5 并发发帖只创建一个 POST（deferred 校验/查题）', async () => {
  const validate = deferred();
  const checkGate = deferred();
  const createGate = deferred();
  let createCalls = 0;
  globalThis.__api.getProblemDetail = async () => checkGate.promise;
  globalThis.__api.createDiscussion = async () => {
    createCalls += 1;
    return createGate.promise;
  };

  const state = useDiscussAdd();
  state.formRef.value = { validate: () => validate.promise };
  state.formValue.value.title = 't';
  state.formValue.value.category = 'Problem';
  state.formValue.value.problemId = 'P1';
  state.formValue.value.content = 'c';

  const p1 = state.handlePublish();
  const p2 = state.handlePublish();
  assert.equal(state.publishing.value, true, '校验开始即应持锁');

  validate.resolve();
  await tick();
  assert.equal(createCalls, 0, '查题未完成前不得发帖');

  checkGate.resolve(true);
  await tick();
  assert.equal(createCalls, 1, '确认题目存在后只创建一次');

  createGate.resolve({ id: 9 });
  await Promise.all([p1, p2]);
  assert.equal(createCalls, 1);
  assert.equal(state.publishing.value, false);
});

// ---- R8：分页/筛选旧响应不得覆盖新查询（局部序号） ----
await check('R8 题单题目：迟到的旧 problemId 查码不覆盖新题单', async () => {
  const oldCheck = deferred();
  globalThis.__api.getTrainingProblems = async (tid) =>
    tid === 't1'
      ? { list: [{ problemId: 1, displayId: 1 }], total: 1 }
      : { list: [{ problemId: 2, displayId: 2 }], total: 1 };
  globalThis.__api.checkProblem = async (pid) =>
    pid === 1 ? oldCheck.promise : { problemCode: 'P2', title: 'two' };

  const state = useTrainingProblems();
  const first = state.fetchProblemsInTraining('t1');
  const second = state.fetchProblemsInTraining('t2');
  await second;
  assert.equal(state.tableData.value[0]?.problemCode, 'P2');

  oldCheck.resolve({ problemCode: 'P1', title: 'one' });
  await first;
  assert.equal(state.tableData.value[0]?.problemCode, 'P2', '旧题单响应不得覆盖新题单');
});

await check('R8 作业题目组件：切换 detail 后旧查码响应不覆盖新作业', async () => {
  const component = await loadHomeworkProblemsComponent();
  const oldCheck = deferred();
  globalThis.__api.checkProblem = async (pid) =>
    pid === 1 ? oldCheck.promise : { problemCode: 'P2', title: 'two' };
  const props = globalThis.__vueReactive({
    detail: { id: 'h1', problems: [{ problemId: 1, displayId: 'A' }] },
  });
  const bindings = component.setup(props, { expose() {} });
  await new Promise((resolve) => setImmediate(resolve));

  props.detail = { id: 'h2', problems: [{ problemId: 2, displayId: 'B' }] };
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(bindings.rows.value[0]?.problemCode, 'P2');

  oldCheck.resolve({ problemCode: 'P1', title: 'one' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(bindings.rows.value[0]?.problemCode, 'P2', '旧作业响应不得覆盖新作业');
});

await check('R8 作业列表：旧 keyword 响应不覆盖新查询', async () => {
  const oldFetch = deferred();
  globalThis.__api.getHomeworks = async (_page, _size, keyword) => {
    if (keyword === 'a') return oldFetch.promise;
    return { list: [{ id: 2, title: 'B', problemCount: 1 }], total: 1 };
  };
  const state = useHomeworkList();
  const first = state.fetchHomeworks({ keyword: 'a' });
  const second = state.fetchHomeworks({ keyword: 'b' });
  await second;
  assert.equal(state.listData.value[0]?.title, 'B');
  oldFetch.resolve({ list: [{ id: 1, title: 'A' }], total: 1 });
  await first;
  assert.equal(state.listData.value[0]?.title, 'B', '旧查询响应不得覆盖新查询');
});

// ---- business R6：变化数不得伪造为 processedCount ----
await check('R6 重判任务 changeCount 为 null，processedCount 保持真实值', async () => {
  globalThis.__api.get = async () => ({
    list: [
      {
        id: 1,
        problemCode: 'P1000',
        contestId: null,
        rangeStart: null,
        rangeEnd: null,
        status: 'finished',
        totalCount: 10,
        processedCount: 4,
        failedCount: 1,
        lastError: null,
        adminId: 'admin',
        gmtCreate: '2026-09-20T12:00:00',
      },
    ],
    total: 1,
  });
  const state = useRejudge();
  await state.fetchRejudgeList();
  const row = state.rejudgeList.value[0];
  assert.equal(row.processedCount, 4, 'processedCount 应保持后端真实值');
  assert.equal(row.changeCount, null, '后端未返回变化数时不得用 processedCount 冒充');
});

// ---- ContestItem 修复：getter 形式的时间源可随 props 变化重算 ----
await check('ContestItem 时间源 getter：props 变化后状态重算', async () => {
  const begin = ref('2020-01-01T00:00:00');
  const end = ref('2020-01-02T00:00:00');
  const { contestStatus } = useStatusTime(() => begin.value, () => end.value);
  assert.equal(contestStatus.value, 2, '过去区间应为已结束');

  begin.value = '2999-01-01T00:00:00';
  end.value = '2999-01-02T00:00:00';
  assert.equal(contestStatus.value, 0, '切换为未来区间后应重算为未开始');
});

// ---- R6：UserSetting 认证上传成功后清空受控 fileList，失败时保留 ----
await check('R6 上传成功后清空受控 fileList 与已选文件', async () => {
  const createCalls = [];
  globalThis.__api.submitAchievementApply = async (fd) => {
    createCalls.push(fd);
    return {};
  };
  const bindings = await loadUserSettingComponent();
  bindings.form.title = '比赛';
  bindings.handleFileChange({ fileList: [makeUpload('a.pdf')] });
  // 模拟 n-upload v-model 把同一列表写入受控 fileList
  bindings.fileList.value = [makeUpload('a.pdf')];
  assert.equal(bindings.file.value?.name, 'a.pdf');

  await bindings.handleSubmit();
  assert.equal(createCalls.length, 1, '应真实提交一次 multipart');
  assert.equal(bindings.submitting.value, false);
  assert.equal(bindings.file.value, null, '成功后清空已选文件');
  assert.deepEqual(bindings.fileList.value, [], '成功后清空受控列表');
  assert.equal(bindings.form.title, '');
});

await check('R6 上传失败时保留 fileList 与已选文件，且 submitting 释放', async () => {
  globalThis.__api.submitAchievementApply = async () => {
    throw new Error('上传失败');
  };
  const bindings = await loadUserSettingComponent();
  bindings.form.title = '比赛';
  const upload = makeUpload('b.pdf');
  bindings.handleFileChange({ fileList: [upload] });
  bindings.fileList.value = [upload];

  await bindings.handleSubmit();
  assert.equal(bindings.submitting.value, false, '失败后必须释放提交锁');
  assert.equal(bindings.file.value?.name, 'b.pdf', '失败后保留已选文件供重试');
  assert.equal(bindings.fileList.value.length, 1, '失败后保留受控列表');
  assert.equal(bindings.form.title, '比赛', '失败后保留表单标题');
});

// ---- R1：DiscussComments 失败保留草稿/编辑框，成功才清空并关闭 ----
await check('R1 评论组件：失败保留草稿且不关闭，成功清空并 close', async () => {
  const component = await loadDiscussCommentsComponent();
  const events = [];
  const props = {
    comments: [],
    visible: true,
    initialText: '',
    submitComment: async (text) => {
      props.__calls.push(text);
      return false;
    },
    __calls: [],
  };
  const bindings = component.setup(props, { expose() {}, emit: (e) => events.push(e) });
  bindings.inputValue.value = 'draft';
  await bindings.handleSubmit();
  assert.deepEqual(props.__calls, ['draft'], '失败也必须尝试写入');
  assert.equal(bindings.inputValue.value, 'draft', '失败后保留草稿');
  assert.equal(events.includes('close'), false, '失败不得关闭编辑框');

  props.submitComment = async (text) => {
    props.__calls.push(text);
    return true;
  };
  await bindings.handleSubmit();
  assert.equal(bindings.inputValue.value, '', '成功后才清空草稿');
  assert.ok(events.includes('close'), '成功后才关闭编辑框');
});

// ---- AC1：查看记录按 pid 真实过滤；比赛记录带 cid ----
await check('AC1 提交记录从 query.pid/cid 初始化并发送真实过滤', async () => {
  const captured = [];
  globalThis.__api.getSubmissions = async (params) => {
    captured.push(params);
    return { list: [], total: 0 };
  };
  globalThis.__route = { query: { pid: 'P1001', cid: '7' }, params: {} };
  globalThis.__routeRef = null;
  const state = useStatusList();
  await state.fetchStatus();
  assert.equal(captured[0].problemCode, 'P1001', '应发送 problemCode 过滤');
  assert.equal(captured[0].contestId, '7', '应发送 contestId 过滤');

  // 路由 query 变化后应重新按新值查询
  globalThis.__routeRef.query = { pid: 'P2002' };
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(captured[captured.length - 1].problemCode, 'P2002', 'pid 变化后应重新过滤');
});

await check('AC1 提交记录旧分页响应不覆盖新查询（局部序号）', async () => {
  globalThis.__route = { query: {}, params: {} };
  globalThis.__routeRef = null;
  const oldFetch = deferred();
  let calls = 0;
  globalThis.__api.getSubmissions = async () => {
    calls += 1;
    if (calls === 1) return oldFetch.promise;
    return {
      list: [{ submissionId: 'new', problemCode: 'P2', status: 0, language: 'cpp' }],
      total: 1,
    };
  };
  const state = useStatusList();
  const first = state.fetchStatus();
  state.filters.value.problem = 'P2';
  const second = state.fetchStatus();
  await second;
  assert.equal(state.listData.value[0]?.id, 'new');

  oldFetch.resolve({
    list: [{ submissionId: 'old', problemCode: 'P1', status: 0, language: 'cpp' }],
    total: 1,
  });
  await first;
  assert.equal(state.listData.value[0]?.id, 'new', '旧分页响应不得覆盖新查询');
});

console.log(`\n${passed} oj rework behavior checks passed`);
