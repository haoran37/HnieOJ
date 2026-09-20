// B1 批次（标签 / 推荐 / 远程评测账号 / 公告新闻分类）行为回归。
// 用受控 HTTP 桩验证真实 API 路径与参数、组合式竞态/失败/重复提交防护，
// 并编译 ProblemDetail.vue 的 <script setup> 验证推荐请求的旧响应作废。
// 运行：node scripts/verify-remaining-b1.mjs（在仓库根目录）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { reactive, effectScope } from 'vue';
import { parse, compileScript } from 'vue/compiler-sfc';

const root = process.cwd();
const dataUrl = (code) => 'data:text/javascript,' + encodeURIComponent(code);
const vueUrl = import.meta.resolve('vue');

// --------------------------------------------------
// 全局桩（naive-ui / vue-router / icons / store）
// --------------------------------------------------
const messages = [];
globalThis.__msg = {
  success: (value) => messages.push({ type: 'success', value }),
  error: (value) => messages.push({ type: 'error', value }),
  warning: (value) => messages.push({ type: 'warning', value }),
};
globalThis.__user = { getProblemStatus: () => null };
globalThis.__route = reactive({ params: { id: 'P1' }, query: {} });
globalThis.__pushed = [];

const naiveStub = dataUrl(
  'export const useMessage=()=>globalThis.__msg; export const useDialog=()=>globalThis.__dialog;',
);
const routerStub = dataUrl(
  'export const useRoute=()=>globalThis.__route;' +
    'export const useRouter=()=>({push:(p)=>{globalThis.__pushed.push(p);},replace:()=>{},back:()=>{}});',
);
const iconsStub = dataUrl(
  'const i={}; export const TimeOutline=i,HardwareChipOutline=i,BarChartOutline=i,CopyOutline=i,' +
    'CloudUploadOutline=i,ArrowBackOutline=i,ChatbubblesOutline=i;',
);
const storeStub = dataUrl('export const useUserStore=()=>globalThis.__user;');
const statusStub = dataUrl('export const renderStatusIcon=()=>null;');
const problemSubmitStub = dataUrl('export default {};');

const problemDetailPath = path.join(root, 'src/views/oj/ProblemsPage/ProblemDetail.vue');
const compiledPath = path.join(os.tmpdir(), `dsh-problem-detail-${process.pid}.ts`);

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'vue') return { shortCircuit: true, url: vueUrl };
    if (specifier === 'naive-ui') return { shortCircuit: true, url: naiveStub };
    if (specifier === 'vue-router') return { shortCircuit: true, url: routerStub };
    if (specifier === '@vicons/ionicons5') return { shortCircuit: true, url: iconsStub };
    if (specifier === '@/stores/userStore') return { shortCircuit: true, url: storeStub };
    if (specifier === '@/utils/statusUtils') return { shortCircuit: true, url: statusStub };
    if (specifier.endsWith('components/ProblemSubmit.vue')) {
      return { shortCircuit: true, url: problemSubmitStub };
    }
    if (specifier.endsWith('ProblemDetail.vue')) {
      const source = fs.readFileSync(problemDetailPath, 'utf8');
      const { descriptor } = parse(source, { filename: problemDetailPath });
      const compiled = compileScript(descriptor, { id: 'problem-detail-test' });
      fs.writeFileSync(compiledPath, compiled.content, 'utf8');
      return { shortCircuit: true, url: pathToFileURL(compiledPath).href };
    }
    if (specifier.startsWith('@/')) {
      let target = path.join(root, 'src', specifier.slice(2));
      if (!path.extname(target)) target += '.ts';
      return next(pathToFileURL(target).href, context);
    }
    // 允许源码中省略 .ts 的相对导入（Vite 解析，Node 原生不支持）
    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !path.extname(specifier) &&
      context.parentURL?.startsWith('file:')
    ) {
      const candidate = fileURLToPath(new URL(`${specifier}.ts`, context.parentURL));
      if (fs.existsSync(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    return next(specifier, context);
  },
});

// --------------------------------------------------
// 受控 HTTP
// --------------------------------------------------
const storage = new Map([['token', 'real-token']]);
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

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
const lastQuery = () => Object.fromEntries(new URL(lastCall().url, 'http://localhost').searchParams.entries());
const lastBody = () => JSON.parse(String(lastCall().init?.body));

// --------------------------------------------------
// 真实模块
// --------------------------------------------------
const api = await import(pathToFileURL(path.join(root, 'src/utils/api.ts')).href);
const { toTagCategories } = await import(
  pathToFileURL(path.join(root, 'src/composables/useTags.ts')).href
);
const { useTagManage } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useTagManage.ts')).href
);
const { useAnnouncement } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useAnnouncement.ts')).href
);
const { useAdminNews } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useAdminNews.ts')).href
);
const { useSystemConfig } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useSystemConfig.ts')).href
);
const { useNewsList } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useNewsList.ts')).href
);
const ProblemDetail = (await import(pathToFileURL(problemDetailPath).href)).default;

// ProblemDetail 的 route watch 会注册到响应式 route 上；用 effectScope 承载，
// 每个用例结束后停止，避免 watch 泄漏到后续用例（尤其是驱动真实路由变更时）。
let problemDetailScope = null;
function unmountProblemDetail() {
  if (problemDetailScope) {
    problemDetailScope.stop();
    problemDetailScope = null;
  }
}

let passed = 0;
let failures = 0;
async function test(name, fn) {
  messages.length = 0;
  try {
    await fn();
    passed += 1;
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + ': ' + (error && error.message));
  } finally {
    unmountProblemDetail();
  }
}

// ==================================================
// 1. 真实 API 路径 / 参数
// ==================================================

await test('标签目录：GET /api/tags 且带 Bearer', async () => {
  calls = [];
  responder = async () => json([{ id: 3, name: '动态规划', color: '#409EFF', category: '算法' }]);
  const list = await api.getTags();
  assert.equal(lastCall().url, '/api/tags');
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token');
  assert.equal(list[0].name, '动态规划');
});

await test('标签管理：POST/PUT/DELETE 路径与名称/颜色/分类载荷', async () => {
  calls = [];
  responder = async () => json(null);
  await api.createAdminTag({ name: 'dp', color: '#fff', category: '算法' });
  assert.equal(lastCall().url, '/api/admin/tags');
  assert.equal(lastCall().init.method, 'POST');
  assert.deepEqual(lastBody(), { name: 'dp', color: '#fff', category: '算法' });

  await api.updateAdminTag(7, { name: 'dp2', color: '', category: '' });
  assert.equal(lastCall().url, '/api/admin/tags/7');
  assert.equal(lastCall().init.method, 'PUT');
  assert.deepEqual(lastBody(), { name: 'dp2', color: '', category: '' });

  await api.deleteAdminTag('a b');
  assert.equal(lastCall().url, '/api/admin/tags/a%20b');
  assert.equal(lastCall().init.method, 'DELETE');
});

await test('标签分组：source 映射来源、空分类归未分类、值为 name 字符串', () => {
  const groups = toTagCategories([
    { id: 1, name: 'Codeforces', color: null, category: 'source' },
    { id: 2, name: '动态规划', color: null, category: '算法' },
    { id: 3, name: '未标注', color: null, category: '' },
    { id: 4, name: '数学', color: null, category: '算法' },
  ]);
  const source = groups.find((g) => g.id === 'source');
  assert.ok(source, 'source 分类必须映射到来源分组');
  assert.deepEqual(source.groups[0].tags, ['Codeforces']);
  const algo = groups.find((g) => g.name === '算法');
  assert.deepEqual(algo.groups[0].tags, ['动态规划', '数学']);
  const uncategorized = groups.find((g) => g.name === '未分类');
  assert.deepEqual(uncategorized.groups[0].tags, ['未标注']);
});

await test('推荐：GET /api/problems/{encodedCode}/recommendations?limit=5', async () => {
  calls = [];
  responder = async () => json([{ id: 12, problemCode: 'P1001', title: 'A+B' }]);
  await api.getProblemRecommendations('P 1', 5);
  assert.equal(lastCall().url, '/api/problems/P%201/recommendations?limit=5');
  await api.getProblemRecommendations('P1001');
  assert.equal(lastCall().url, '/api/problems/P1001/recommendations?limit=5');
});

await test('前台公告：第 4 参数 category 可选，旧三参调用不发送 category', async () => {
  calls = [];
  responder = async () => json({ list: [], total: 0 });
  await api.getAnnouncements(1, 10, ' 关键字 ', 'NEWS');
  let query = lastQuery();
  assert.equal(query.keyword, '关键字');
  assert.equal(query.category, 'NEWS');

  await api.getAnnouncements(1, 10);
  query = lastQuery();
  assert.ok(!('category' in query), '旧调用不得发送 category');
  assert.ok(!('keyword' in query), '空 keyword 不应发送');
});

await test('管理公告：category 进入列表查询', async () => {
  calls = [];
  responder = async () => json({ list: [], total: 0 });
  await api.getAdminAnnouncements({ page: 1, pageSize: 10, category: 'NEWS' });
  assert.equal(lastQuery().category, 'NEWS');
});

await test('远程账号：列表/创建/更新/删除真实路径与载荷', async () => {
  calls = [];
  responder = async () => json([]);
  await api.getRemoteJudgeAccounts({ oj: ' codeforces ', status: 1 });
  assert.equal(lastCall().url.split('?')[0], '/api/admin/judge/account');
  assert.equal(lastQuery().oj, 'codeforces');
  assert.equal(lastQuery().status, '1');

  await api.getRemoteJudgeAccounts();
  assert.equal(lastCall().url, '/api/admin/judge/account');

  responder = async () => json(null);
  await api.createRemoteJudgeAccount({ oj: 'codeforces', username: 'alice', password: 'p', status: 1, maxConcurrency: 2 });
  assert.equal(lastCall().url, '/api/admin/judge/account');
  assert.equal(lastCall().init.method, 'POST');
  assert.deepEqual(lastBody(), { oj: 'codeforces', username: 'alice', password: 'p', status: 1, maxConcurrency: 2 });

  await api.updateRemoteJudgeAccount(7, { username: 'alice2' });
  assert.equal(lastCall().url, '/api/admin/judge/account/7');
  assert.equal(lastCall().init.method, 'PUT');
  assert.deepEqual(lastBody(), { username: 'alice2' });

  await api.deleteRemoteJudgeAccount(7);
  assert.equal(lastCall().url, '/api/admin/judge/account/7');
  assert.equal(lastCall().init.method, 'DELETE');
});

// ==================================================
// 2. 组合式行为：标签管理
// ==================================================

await test('标签管理：本地分页不伪造 total，创建载荷 trim', async () => {
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'POST') return json(null);
    return json([
      { id: 1, name: 'a', color: null, category: null },
      { id: 2, name: 'b', color: '#fff', category: '算法' },
    ]);
  };
  const state = useTagManage();
  await state.fetchTags();
  assert.equal(state.pagination.itemCount, 2, 'itemCount 必须是真实条数');

  state.openCreateModal();
  state.formModel.name = '  新标签  ';
  state.formModel.color = ' #abc ';
  state.formModel.category = ' 算法 ';
  await state.handleSubmit();
  const post = calls.find((call) => call.init?.method === 'POST');
  assert.ok(post, '必须发起 POST /api/admin/tags');
  assert.deepEqual(JSON.parse(post.init.body), { name: '新标签', color: '#abc', category: '算法' });
});

await test('标签管理：名称为空时不发请求；加载失败不伪装空成功', async () => {
  calls = [];
  responder = async () => json([{ id: 1, name: 'a', color: null, category: null }]);
  const state = useTagManage();
  await state.fetchTags();
  state.openCreateModal();
  state.formModel.name = '   ';
  await state.handleSubmit();
  assert.equal(calls.filter((call) => call.init?.method === 'POST').length, 0, '空名称不得提交');

  calls = [];
  responder = async () => json({ code: 500, msg: 'boom', data: null }, 500);
  const failed = useTagManage();
  await failed.fetchTags();
  assert.ok(failed.error.value, '加载失败必须保留 error');
  assert.equal(failed.tags.value.length, 0);
});

await test('标签管理：删除被引用标签保留后端业务错误', async () => {
  messages.length = 0;
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'DELETE') return jsonMsg('标签已被题目引用，无法删除');
    return json([{ id: 1, name: 'a', color: null, category: null }]);
  };
  const state = useTagManage();
  await state.fetchTags();
  await state.handleDelete({ id: 1, name: 'a', color: null, category: null });
  const error = messages.find((m) => m.type === 'error');
  assert.ok(error, '删除失败必须提示错误');
  assert.ok(String(error.value).includes('引用'), `必须保留后端“仍被引用”错误：${JSON.stringify(messages)}`);
});

await test('标签管理：保存进行中禁止关闭与切换新建', async () => {
  calls = [];
  let releasePut;
  responder = async (url, init) => {
    if (init?.method === 'PUT') return new Promise((resolve) => { releasePut = resolve; });
    return json([{ id: 1, name: 'a', color: null, category: null }]);
  };
  const state = useTagManage();
  state.openEditModal({ id: 1, name: '原名', color: '#fff', category: '算法' });
  state.formModel.name = '待保存';
  const first = state.handleSubmit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.saving.value, true, '保存进行中');

  state.openCreateModal();
  assert.equal(state.formModel.id, 1, '保存中不得切到新建记录');
  assert.equal(state.formModel.name, '待保存', '保存中不得重置表单');
  state.closeModal();
  state.handleModalShowChange(false);
  assert.equal(state.showModal.value, true, '保存中不得关闭弹窗');

  releasePut(json(null));
  await first;
  assert.equal(state.showModal.value, false, '保存完成后才允许关闭');
});

// ==================================================
// 3. 组合式行为：公告/新闻分类
// ==================================================

await test('公告管理：NEWS 分类进入列表查询与保存载荷', async () => {
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'POST') return json(null);
    return json({ list: [], total: 0 });
  };
  const news = useAnnouncement('NEWS');
  await news.fetchAnnouncements();
  const listCall = calls.find(
    (call) => call.url.includes('/api/admin/announcements?') && call.init?.method === 'GET',
  );
  assert.ok(listCall.url.includes('category=NEWS'), 'NEWS 列表必须带 category');

  news.openCreateModal();
  news.formModel.title = 'hello';
  news.formModel.content = 'body';
  await news.handleSubmit();
  const post = calls.find((call) => call.init?.method === 'POST');
  const body = JSON.parse(post.init.body);
  assert.equal(body.category, 'NEWS');
});

await test('新闻管理：useAdminNews 固定 NEWS，编辑详情保留原分类', async () => {
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'PUT') return json(null);
    if (url.endsWith('/5')) return json({ id: 5, title: 'n', content: 'c', status: 0, category: 'NEWS' });
    return json({ list: [], total: 0 });
  };
  const news = useAdminNews();
  assert.equal(news.formModel.category, 'NEWS', '新建新闻默认 NEWS');
  await news.openEditModal({ id: 5, title: 'n' });
  assert.equal(news.formModel.category, 'NEWS');
  news.formModel.title = 'n2';
  await news.handleSubmit();
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.equal(JSON.parse(put.init.body).category, 'NEWS');
});

await test('公告管理：列表失败保留 error，不伪装空列表成功', async () => {
  messages.length = 0;
  responder = async () => json({ code: 500, msg: 'list boom', data: null }, 500);
  const state = useAnnouncement('ANNOUNCEMENT');
  await state.fetchAnnouncements();
  assert.ok(state.error.value, '列表失败必须保留 error');
  assert.equal(state.announcements.value.length, 0);
});

await test('公告管理：保存进行中禁止换 form、开详情请求或关闭', async () => {
  calls = [];
  let releasePost;
  responder = async (url, init) => {
    if (init?.method === 'POST') return new Promise((resolve) => { releasePost = resolve; });
    if (url.endsWith('/9')) return json({ id: 9, title: 'other', content: 'o', status: 0, category: 'ANNOUNCEMENT' });
    return json({ list: [], total: 0 });
  };
  const state = useAnnouncement('ANNOUNCEMENT');
  state.openCreateModal();
  state.formModel.title = 'draft';
  state.formModel.content = 'body';
  const first = state.handleSubmit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.saving.value, true, '保存进行中');

  await state.openEditModal({ id: 9, title: 'other' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.formModel.title, 'draft', '保存中不得换 form');
  assert.equal(state.modalMode.value, 'create', '保存中不得切到编辑');
  assert.equal(
    calls.filter((call) => call.init?.method === 'GET' && call.url.endsWith('/9')).length,
    0,
    '保存中不得发起详情请求',
  );
  state.closeModal();
  state.handleModalShowChange(false);
  assert.equal(state.showModal.value, true, '保存中不得关闭弹窗');

  releasePost(json(null));
  await first;
  assert.equal(state.showModal.value, false, '保存完成后才允许关闭');
});

await test('新闻管理：useAdminNews 保存进行中同样禁止换 form 或重复提交', async () => {
  calls = [];
  let releasePut;
  responder = async (url, init) => {
    if (init?.method === 'PUT') return new Promise((resolve) => { releasePut = resolve; });
    if (url.endsWith('/5')) return json({ id: 5, title: 'n', content: 'c', status: 1, category: 'NEWS' });
    return json({ list: [], total: 0 });
  };
  const news = useAdminNews();
  await news.openEditModal({ id: 5, title: 'n' });
  const first = news.handleSubmit();
  const second = news.handleSubmit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.filter((call) => call.init?.method === 'PUT').length, 1, '保存中不得重复提交');
  news.openCreateModal();
  assert.equal(news.formModel.id, 5, '保存中不得切到新建');
  news.closeModal();
  assert.equal(news.showModal.value, true, '保存中不得关闭弹窗');
  releasePut(json(null));
  await first;
  await second;
});

// ==================================================
// 4. 组合式行为：远程评测账号（密码/重复提交/失败）
// ==================================================

const accountRow = { id: 7, oj: 'codeforces', username: 'alice', status: 1, maxConcurrency: 2 };

await test('远程账号：新增必填密码，缺失拒绝提交', async () => {
  calls = [];
  responder = async () => json(null);
  const state = useSystemConfig();
  state.openCreateAccountModal();
  state.accountForm.oj = 'codeforces';
  state.accountForm.username = 'bob';
  state.accountForm.password = '   ';
  await state.handleAccountSubmit();
  assert.equal(calls.filter((call) => call.init?.method === 'POST').length, 0, '新增空密码不得提交');
});

await test('远程账号：编辑密码初始为空；留空不发送 password 键', async () => {
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'PUT') return json(null);
    if (init?.method === 'GET') return json([accountRow]);
    return json(null);
  };
  const state = useSystemConfig();
  await state.fetchRemoteJudgeAccounts();
  state.openEditAccountModal(accountRow);
  assert.equal(state.accountForm.password, '', '编辑密码必须初始为空，不回显');
  state.accountForm.username = 'alice2';
  await state.handleAccountSubmit();
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.equal(put.url, '/api/admin/judge/account/7');
  const body = JSON.parse(put.init.body);
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'password'), false, '留空必须省略 password');
  assert.equal(body.username, 'alice2');
});

await test('远程账号：非空密码原样提交（不 trim）', async () => {
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'PUT') return json(null);
    return json([accountRow]);
  };
  const state = useSystemConfig();
  state.openEditAccountModal(accountRow);
  state.accountForm.password = ' secret pass ';
  await state.handleAccountSubmit();
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.equal(JSON.parse(put.init.body).password, ' secret pass ');
});

await test('远程账号：保存期间重复提交只发一次请求', async () => {
  calls = [];
  let releasePut;
  responder = async (url, init) => {
    if (init?.method === 'PUT') return new Promise((resolve) => { releasePut = resolve; });
    if (init?.method === 'GET') return json([accountRow]);
    return json(null);
  };
  const state = useSystemConfig();
  state.openEditAccountModal(accountRow);
  const first = state.handleAccountSubmit();
  const second = state.handleAccountSubmit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.filter((call) => call.init?.method === 'PUT').length, 1, '重复提交必须被忽略');
  releasePut(json(null));
  await first;
  await second;
});

await test('远程账号：列表失败保留旧数据并明确报错，删除后重读列表', async () => {
  calls = [];
  responder = async () => json([accountRow]);
  const state = useSystemConfig();
  await state.fetchRemoteJudgeAccounts();
  assert.equal(state.remoteJudgeAccounts.value.length, 1);

  responder = async () => json({ code: 500, msg: 'list fail', data: null }, 500);
  await state.fetchRemoteJudgeAccounts();
  assert.ok(state.accountsError.value, '列表失败必须报错');
  assert.equal(state.remoteJudgeAccounts.value.length, 1, '失败不得伪装成没有账号');

  calls = [];
  responder = async (url, init) => (init?.method === 'DELETE' ? json(null) : json([]));
  await state.handleDeleteAccount(accountRow);
  assert.ok(
    calls.some((call) => call.init?.method === 'DELETE' && call.url === '/api/admin/judge/account/7'),
    '必须发送 DELETE',
  );
  assert.ok(calls.some((call) => call.init?.method === 'GET'), '删除后必须重读列表');
});

await test('远程账号：保存成功后清空密码，正常关闭也清空密码', async () => {
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'PUT') return json(null);
    if (init?.method === 'GET') return json([accountRow]);
    return json(null);
  };
  const state = useSystemConfig();
  state.openEditAccountModal(accountRow);
  state.accountForm.password = 'secret';
  await state.handleAccountSubmit();
  assert.equal(state.showAccountModal.value, false, '成功后必须关闭弹窗');
  assert.equal(state.accountForm.password, '', '保存成功后必须清空密码，不缓存到下次打开');

  // 正常关闭（取消 / 右上关闭 / Esc 都走 closeAccountModal）同样清空
  state.accountForm.password = 'another';
  state.closeAccountModal();
  assert.equal(state.accountForm.password, '', '正常关闭必须清空密码');
});

await test('远程账号：保存失败保留密码输入且不关闭弹窗', async () => {
  calls = [];
  responder = async (url, init) => {
    if (init?.method === 'PUT') return jsonMsg('保存失败');
    if (init?.method === 'GET') return json([accountRow]);
    return json(null);
  };
  const state = useSystemConfig();
  state.openEditAccountModal(accountRow);
  state.accountForm.password = 'keep me';
  await state.handleAccountSubmit();
  assert.equal(state.accountForm.password, 'keep me', '失败必须保留密码输入');
  assert.equal(state.showAccountModal.value, true, '失败不得关闭弹窗');
});

await test('远程账号：保存进行中禁止关闭与切换记录', async () => {
  calls = [];
  let releasePut;
  responder = async (url, init) => {
    if (init?.method === 'PUT') return new Promise((resolve) => { releasePut = resolve; });
    if (init?.method === 'GET') return json([accountRow]);
    return json(null);
  };
  const state = useSystemConfig();
  state.openEditAccountModal(accountRow);
  state.accountForm.password = 'pending';
  const first = state.handleAccountSubmit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.accountSaving.value, true, '保存进行中');

  // 切换到新建 / 编辑其它记录、右上关闭 / Esc 都必须被阻止
  state.openCreateAccountModal();
  assert.equal(state.accountModalMode.value, 'edit', '保存中不得切到新建');
  assert.equal(state.accountForm.id, accountRow.id, '保存中不得换记录');
  state.closeAccountModal();
  state.handleAccountModalShowChange(false);
  assert.equal(state.showAccountModal.value, true, '保存中不得关闭弹窗');

  releasePut(json(null));
  await first;
  assert.equal(state.showAccountModal.value, false, '保存完成后才允许关闭');
});

// ==================================================
// 5. 组合式行为：前台新闻列表
// ==================================================

await test('新闻列表：只请求 NEWS，翻页保留搜索关键词', async () => {
  calls = [];
  responder = async () => json({ list: [], total: 0 });
  const list = useNewsList('NEWS');
  await list.fetchNews('动态');
  list.handlePageChange(2);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const query = new URL(lastCall().url, 'http://localhost').searchParams;
  assert.equal(query.get('page'), '2');
  assert.equal(query.get('keyword'), '动态');
  assert.equal(query.get('category'), 'NEWS');
});

await test('新闻列表：旧响应不得覆盖新请求结果', async () => {
  let receive = 0;
  let releaseFirst;
  responder = async () => {
    receive += 1;
    if (receive === 1) return new Promise((resolve) => { releaseFirst = resolve; });
    return json({ list: [{ id: 2, title: 'second', uid: 'u', gmtCreate: null, status: 1, category: 'NEWS' }], total: 1 });
  };
  const list = useNewsList('NEWS');
  const first = list.fetchNews('a');
  const second = list.fetchNews('b');
  await second;
  releaseFirst(json({ list: [{ id: 1, title: 'first', uid: 'u', gmtCreate: null, status: 1, category: 'NEWS' }], total: 1 }));
  await first;
  assert.equal(list.newsList.value[0].title, 'second');
});

// ==================================================
// 6. ProblemDetail.vue：推荐旧响应作废 / 详情不清推荐
// ==================================================

function mountProblemDetail() {
  problemDetailScope = effectScope();
  return problemDetailScope.run(() => ProblemDetail.setup({}, { expose: () => {} }));
}

await test('推荐题目：切换题目后旧响应作废，详情成功不清推荐', async () => {
  const bindings = mountProblemDetail();
  assert.ok(bindings.recommendedProblems, '脚本 setup 必须暴露推荐状态');

  let releaseP1;
  calls = [];
  responder = async (url) => {
    const target = String(url);
    if (target.includes('/recommendations')) {
      if (target.includes('/P1/')) {
        return new Promise((resolve) => { releaseP1 = resolve; });
      }
      return json([{ id: 2, problemCode: 'P2', title: 'Second' }]);
    }
    if (target === '/api/problems/P2') {
      return json({ problemCode: 'P2', title: 'Second', examples: [] });
    }
    return json({ list: [], total: 0 });
  };

  const p1 = bindings.fetchRecommendations('P1');
  const p2 = bindings.fetchRecommendations('P2');
  // 切换同步清空旧结果
  assert.equal(bindings.recommendedProblems.value.length, 0, '切换题目必须同步清空旧结果');
  await p2;
  assert.deepEqual(
    bindings.recommendedProblems.value.map((item) => item.problemCode),
    ['P2'],
  );

  releaseP1(json([{ id: 1, problemCode: 'P1', title: 'First' }]));
  await p1;
  assert.deepEqual(
    bindings.recommendedProblems.value.map((item) => item.problemCode),
    ['P2'],
    '上一题迟到响应不得填入当前题',
  );

  // 详情 fetch 成功后不得再次清掉新推荐
  await bindings.fetchProblemDetail('P2');
  assert.deepEqual(
    bindings.recommendedProblems.value.map((item) => item.problemCode),
    ['P2'],
    '详情成功后不得清掉推荐',
  );
});

await test('推荐题目：空结果显示暂无推荐，失败显示错误并可重试，导航用 problemCode', async () => {
  const bindings = mountProblemDetail();
  calls = [];
  let failNext = true;
  responder = async (url) => {
    if (String(url).includes('/recommendations')) {
      if (failNext) {
        failNext = false;
        return json({ code: 403, msg: '私有源无权限', data: null }, 403);
      }
      return json([]);
    }
    return json(null);
  };

  await bindings.fetchRecommendations('P9');
  assert.ok(bindings.recError.value, '失败必须保留错误供重试');
  assert.equal(bindings.recLoading.value, false);

  await bindings.fetchRecommendations('P9');
  assert.equal(bindings.recError.value, null, '重试成功后必须清除错误');
  assert.equal(bindings.recommendedProblems.value.length, 0);

  globalThis.__pushed = [];
  bindings.handleRecClick('P123');
  assert.deepEqual(globalThis.__pushed, ['/problem/P123'], '导航必须使用 problemCode');
});

await test('推荐题目：真实 route.params.id 变更同步清空并作废旧请求', async () => {
  globalThis.__route.params = { id: 'PA' };
  const bindings = mountProblemDetail();

  let releaseP1;
  calls = [];
  responder = async (url) => {
    const target = String(url);
    if (target.includes('/P1/recommendations')) {
      return new Promise((resolve) => { releaseP1 = resolve; });
    }
    if (target.includes('/P2/recommendations')) {
      return json([{ id: 2, problemCode: 'P2', title: 'Second' }]);
    }
    if (target === '/api/problems/P2') return json({ problemCode: 'P2', title: 'Second', examples: [] });
    if (target === '/api/problems/P1') return json({ problemCode: 'P1', title: 'First', examples: [] });
    return json({ list: [], total: 0 });
  };

  // 真实路由变更 PA -> P1，P1 推荐请求保持挂起
  globalThis.__route.params.id = 'P1';
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(typeof releaseP1, 'function', 'P1 推荐请求应已由 watch 发出');

  // 模拟 P1 已成功填充的旧结果与旧错误
  bindings.recommendedProblems.value = [{ id: '1', problemCode: 'P1', title: 'First' }];
  bindings.recError.value = '旧错误';

  // 真实路由变更 P1 -> P2：无需 await 即同步清空旧结果
  globalThis.__route.params.id = 'P2';
  assert.equal(bindings.recommendedProblems.value.length, 0, '路由变更必须同步清空旧推荐');
  assert.equal(bindings.recError.value, null, '路由变更必须清空旧错误');

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(bindings.recommendedProblems.value.map((item) => item.problemCode), ['P2']);

  // P1 迟到响应不得填入当前 P2
  releaseP1(json([{ id: 1, problemCode: 'P1', title: 'First' }]));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(
    bindings.recommendedProblems.value.map((item) => item.problemCode),
    ['P2'],
    '上一题迟到响应不得填入当前题',
  );
});

fs.rmSync(compiledPath, { force: true });

console.log(`\n${passed} checks passed` + (failures ? `, ${failures} FAILED` : ''));
process.exitCode = failures ? 1 : 0;
