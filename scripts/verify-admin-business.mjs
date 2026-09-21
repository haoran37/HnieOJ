// 本批（比赛/队伍/训练/作业管理真实接线）行为回归：
// 直接实例化真实 composable，以受控 HTTP 响应验证真实请求行为：
// - 比赛/作业题目展示编号为 String(A/B)，训练为 Integer>=1；
// - 题目查验使用 /api/problems/check?problemId=number（绝不把 problemCode 当数字）；
// - 成员 UID 真实随请求发送、重复不重复添加；
// - 时间毫秒 epoch、status 布尔、classIds 数字数组；
// - remote 服务端分页 total>pageSize 可翻第二页；
// - 父级筛选快速切换旧响应不得回填。
// 运行：node scripts/verify-admin-business.mjs（在仓库根目录）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import { reactive } from 'vue';

const root = process.cwd();
const dataUrl = (code) => 'data:text/javascript,' + encodeURIComponent(code);

const messages = [];
globalThis.__msg = {
  success: (value) => messages.push({ type: 'success', value }),
  error: (value) => messages.push({ type: 'error', value }),
  warning: (value) => messages.push({ type: 'warning', value }),
};
globalThis.__route = reactive({ params: { id: '1' }, query: {} });
const pushes = [];
globalThis.__pushes = pushes;
globalThis.__router = {
  push: (arg) => {
    pushes.push(arg);
    return Promise.resolve();
  },
  replace: () => Promise.resolve(),
  back: () => {},
};

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'naive-ui') {
      return {
        shortCircuit: true,
        url: dataUrl(
          'export const useMessage=()=>globalThis.__msg;' +
            'export const NButton={};export const NTag={};export const NSpace={};' +
            'export const NPopconfirm={};export const NIcon={};export const NInput={};' +
            'export const NInputGroup={};export const NInputNumber={};export const NFormItem={};' +
            'export const NDataTable={};',
        ),
      };
    }
    if (specifier === 'vue-router') {
      return {
        shortCircuit: true,
        url: dataUrl(
          'export const useRoute=()=>globalThis.__route;' +
            'export const useRouter=()=>globalThis.__router;',
        ),
      };
    }
    if (specifier === '@/stores/userStore') {
      return { shortCircuit: true, url: dataUrl('export const useUserStore=()=>({isAdmin:true});') };
    }
    if (specifier.startsWith('@/')) {
      let file = path.join(root, 'src', specifier.slice(2));
      if (!path.extname(file)) file += '.ts';
      return next(pathToFileURL(file).href, context);
    }
    return next(specifier, context);
  },
});

globalThis.localStorage = { getItem: () => null, removeItem: () => {}, setItem: () => {} };

const json = (data, status = 200) =>
  new Response(
    JSON.stringify({ code: status === 200 ? 200 : status, msg: status === 200 ? 'success' : 'error', data }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let responder = async () => json(null);
let calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  return responder(String(url), init);
};

const bodyOf = (call) => JSON.parse(String(call.init?.body));
const queryOf = (url) => new URL(url, 'http://localhost').searchParams;

const { useContestForm, useContestList } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useContestManage.ts'))
);
const { useTrainingForm, useTrainingManage } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useTrainingManage.ts'))
);
const { useHomeworkForm, useHomeworkList } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useHomeworkManage.ts'))
);
const { useTeamManage } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useTeamManage.ts'))
);
const { formatSystemTime } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useContestMode.ts'))
);

let failures = 0;
async function test(name, fn) {
  messages.length = 0;
  try {
    await fn();
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + ': ' + (error && error.message));
  }
}

await test('比赛题目：按 problemId 数字查验，展示编号为 A 字符串，重复不重复添加', async () => {
  calls = [];
  responder = (url) =>
    url.startsWith('/api/problems/check')
      ? json({ exists: true, problemId: 777, problemCode: 'P777', title: '题目777' })
      : json(null);
  const state = useContestForm();
  state.problemInput.value = '777';
  await state.handleAddProblem();
  assert.equal(state.formValue.problems.length, 1);
  assert.equal(state.formValue.problems[0].problemId, 777);
  assert.equal(state.formValue.problems[0].displayId, 'A');
  assert.equal(typeof state.formValue.problems[0].displayId, 'string');
  const check = calls.find((call) => call.url.startsWith('/api/problems/check'));
  assert.ok(check, '应调用 /api/problems/check');
  assert.equal(queryOf(check.url).get('problemId'), '777');
  assert.equal(queryOf(check.url).has('problemCode'), false);

  state.problemInput.value = '777';
  await state.handleAddProblem();
  assert.equal(state.formValue.problems.length, 1, '重复题目不应重复添加');
});

await test('比赛题目：不存在时保留输入且不加入列表', async () => {
  calls = [];
  responder = () => json({ exists: false, problemId: null, problemCode: null, title: null });
  const state = useContestForm();
  state.problemInput.value = '999';
  await state.handleAddProblem();
  assert.equal(state.formValue.problems.length, 0);
  assert.equal(state.problemInput.value, '999');
});

await test('比赛账号：/api/user/check 真实查验、重复不重复、401 保留输入', async () => {
  calls = [];
  responder = () => json({ exists: true, uid: '20230001', username: 'admin' });
  const state = useContestForm();
  state.accountInput.value = '20230001';
  await state.handleAddAccount('20230001');
  assert.equal(state.formValue.accountList.length, 1);
  assert.equal(state.accountInput.value, '', '成功后应清空输入');

  state.accountInput.value = '20230001';
  await state.handleAddAccount('20230001');
  assert.equal(state.formValue.accountList.length, 1, '重复账号不应重复添加');

  responder = () => json({ exists: false, uid: null, username: null });
  state.accountInput.value = 'nobody';
  await state.handleAddAccount('nobody');
  assert.equal(state.formValue.accountList.length, 1);
  assert.equal(state.accountInput.value, 'nobody', '不存在时应保留输入');

  responder = () => json(null, 401);
  state.accountInput.value = 'unauth';
  await state.handleAddAccount('unauth');
  assert.equal(state.formValue.accountList.length, 1, '401 不应添加');
  assert.equal(state.accountInput.value, 'unauth', '401 应保留输入');
});

await test('比赛提交：毫秒时间、布尔 status、实际枚举、账号与 A/B 题目', async () => {
  calls = [];
  pushes.length = 0;
  responder = (_url, init) => (init?.method === 'POST' ? json(null) : json(null));
  const state = useContestForm();
  state.formValue.title = '测试赛';
  state.formValue.type = 'OI';
  state.formValue.auth = 'Private';
  state.formValue.status = false;
  state.formValue.timeRange = [1700000000000, 1700003600000];
  state.formValue.problems = [
    { problemId: 1, problemCode: 'P1', displayId: 'A', displayTitle: 'A题', color: null },
    { problemId: 2, problemCode: 'P2', displayId: 'B', displayTitle: 'B题', color: '#fff' },
  ];
  state.formValue.accountList = [{ uid: 'u1', username: 'U1' }];
  await state.handleSubmit(false);
  const post = calls.find((call) => call.url === '/api/admin/contest' && call.init?.method === 'POST');
  assert.ok(post, '应 POST /api/admin/contest');
  const body = bodyOf(post);
  assert.equal(body.startTime, 1700000000000);
  assert.equal(body.endTime, 1700003600000);
  assert.equal(typeof body.status, 'boolean');
  assert.equal(body.type, 'OI');
  assert.equal(body.auth, 'Private');
  assert.deepEqual(body.accountList, ['u1']);
  assert.deepEqual(
    body.problems.map((p) => p.displayId),
    ['A', 'B'],
  );
  assert.ok(body.problems.every((p) => typeof p.problemId === 'number'));
});

await test('比赛编辑：走管理端详情，PUT 失败保留完整表单且不跳转', async () => {
  pushes.length = 0;
  responder = (url, init) => {
    if (init?.method === 'PUT') return json({ msg: '保存失败' }, 500);
    if (url === '/api/admin/contest/9') {
      return json({
        id: 9,
        title: '原始比赛',
        type: 'ACM',
        auth: 'Public',
        status: true,
        description: null,
        timeRange: [1, 2],
        problems: [{ id: 1, problemId: 5, displayId: 'A', displayTitle: 'T', color: null }],
        accountList: [],
        customTags: [],
      });
    }
    if (url.startsWith('/api/problems/check')) {
      return json({ exists: true, problemId: 5, problemCode: 'P5', title: 'T' });
    }
    return json(null);
  };
  const state = useContestForm();
  await state.loadData(9);
  assert.equal(state.formValue.title, '原始比赛');
  assert.equal(state.formValue.description, '');
  assert.equal(state.formValue.problems[0].displayId, 'A');
  state.formValue.title = '修改后';
  await state.handleSubmit(true, 9);
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.ok(put, '应发送 PUT');
  assert.equal(bodyOf(put).title, '修改后');
  assert.equal(state.formValue.title, '修改后', '失败后保留表单');
  assert.equal(pushes.length, 0, '失败后不应跳转');
});

await test('训练题目：displayId 为 Integer>=1，管理详情保留 privatePwd/description', async () => {
  calls = [];
  responder = (url, init) => {
    if (url === '/api/admin/training/5') {
      return json({
        id: 5,
        title: '私有题单',
        type: 'Official',
        auth: 'Private',
        privatePwd: 'pw',
        description: '真实描述',
        status: false,
        rank: 3,
        problems: [
          { problemId: 11, displayId: 1 },
          { problemId: 12, displayId: 2 },
        ],
      });
    }
    if (url.startsWith('/api/problems/check')) {
      const problemId = Number(queryOf(url).get('problemId'));
      return json({ exists: true, problemId, problemCode: 'P' + problemId, title: 'T' + problemId });
    }
    if (init?.method === 'PUT') return json(null);
    return json(null);
  };
  const state = useTrainingForm();
  await state.loadData(5);
  assert.equal(state.formValue.privatePwd, 'pw');
  assert.equal(state.formValue.description, '真实描述');
  assert.equal(state.formValue.status, false);
  assert.deepEqual(
    state.formValue.problems.map((p) => p.displayId),
    [1, 2],
  );
  assert.ok(state.formValue.problems.every((p) => typeof p.displayId === 'number'));

  state.problemInput.value = '13';
  await state.handleAddProblem();
  assert.equal(state.formValue.problems[2].displayId, 3);
  assert.equal(typeof state.formValue.problems[2].displayId, 'number');

  calls = [];
  state.formValue.title = '只改标题';
  await state.handleSubmit(true, 5);
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.ok(put, '应发送 PUT');
  const body = bodyOf(put);
  assert.equal(body.title, '只改标题');
  assert.equal(body.privatePwd, 'pw', '只改标题必须保留 privatePwd');
  assert.equal(body.description, '真实描述');
  assert.deepEqual(
    body.problems.map((p) => p.displayId),
    [1, 2, 3],
  );
  assert.ok(body.problems.every((p) => Number.isInteger(p.displayId) && p.displayId >= 1));
});

await test('作业：classIds 数字数组、null description 归一为字符串、A/B 字符串展示编号', async () => {
  calls = [];
  responder = (url, init) => {
    if (url === '/api/admin/homework/7') {
      return json({
        id: 7,
        title: '作业7',
        description: null,
        source: 's',
        status: true,
        timeRange: [1700000000000, 1700003600000],
        classIds: [3, 4],
        problems: [
          { id: 1, problemId: 11, displayId: 'A' },
          { id: 2, problemId: 12, displayId: 'B' },
        ],
      });
    }
    if (url.startsWith('/api/problems/check')) {
      const problemId = Number(queryOf(url).get('problemId'));
      return json({ exists: true, problemId, problemCode: 'P' + problemId, title: 'T' + problemId });
    }
    if (url === '/api/colleges') return json([{ id: 1, name: '计算机学院' }]);
    if (url === '/api/colleges/1/grades') return json([{ id: 1, grade: '2023' }]);
    if (url === '/api/colleges/1/grades/2023/classes') {
      return json([
        { id: 3, name: '计科1班' },
        { id: 4, name: '计科2班' },
      ]);
    }
    // 编辑页按已选班级 id 反查名称走批量端点（GET /api/classes?ids=3,4）
    if (url.startsWith('/api/classes?')) {
      const wanted = (queryOf(url).get('ids') || '').split(',').filter(Boolean);
      const known = {
        '3': '计科1班',
        '4': '计科2班',
      };
      return json(wanted.filter((id) => known[id]).map((id) => ({ id: Number(id), name: known[id] })));
    }
    if (init?.method === 'PUT') return json(null);
    return json(null);
  };
  const state = useHomeworkForm();
  await state.loadData(7);
  assert.equal(state.formValue.description, '', 'null description 必须归一为空串');
  assert.deepEqual(state.formValue.timeRange, [1700000000000, 1700003600000]);
  assert.deepEqual(state.formValue.targetClassIds, [3, 4]);
  assert.ok(state.formValue.targetClassIds.every((id) => typeof id === 'number'));
  assert.deepEqual(
    state.formValue.problems.map((p) => p.displayId),
    ['A', 'B'],
  );
  assert.equal(state.selectedClassList.value[0].label, '计科1班');

  calls = [];
  state.formValue.title = '作业7改';
  await state.handleSubmit(true, 7);
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.ok(put, '应发送 PUT');
  const body = bodyOf(put);
  assert.deepEqual(body.classIds, [3, 4]);
  assert.equal(typeof body.startTime, 'number');
  assert.equal(typeof body.status, 'boolean');
  assert.deepEqual(
    body.problems.map((p) => p.displayId),
    ['A', 'B'],
  );
});

await test('作业：学院快速切换时旧年级响应不得回填', async () => {
  let releaseFirst;
  responder = (url) => {
    if (url === '/api/colleges/1/grades') {
      return new Promise((resolve) => {
        releaseFirst = () => resolve(json([{ id: 1, grade: '1999' }]));
      });
    }
    if (url === '/api/colleges/2/grades') return json([{ id: 2, grade: '2024' }]);
    return json([]);
  };
  const state = useHomeworkForm();
  state.handleCollegeChange(1);
  state.handleCollegeChange(2);
  await tick();
  releaseFirst();
  await tick();
  assert.deepEqual(state.studentSelectState.grades, [{ label: '2024', value: '2024' }]);
});

await test('队伍：cid 来自比赛下拉，创建真实携带成员 UID，批量删除 body{ids}', async () => {
  pushes.length = 0;
  globalThis.__route.query = { cid: '3' };
  calls = [];
  responder = (url, init) => {
    if (url.startsWith('/api/admin/contest/list')) {
      return json({ list: [{ id: 3, title: '比赛3' }], total: 1 });
    }
    if (url.startsWith('/api/admin/contest/team?...')) return json({ list: [], total: 0 });
    if (url.startsWith('/api/admin/contest/team?')) return json({ list: [], total: 0 });
    if (url === '/api/admin/contest/team' && init?.method === 'POST') return json(null);
    if (url === '/api/admin/contest/team' && init?.method === 'DELETE') return json(null);
    return json(null);
  };
  const state = useTeamManage();
  await state.init();
  assert.equal(state.selectedCid.value, 3);

  // 提交必须来自真实打开的弹窗：handleAdd 打开新增弹窗后再填表
  state.handleAdd();
  assert.equal(state.showModal.value, true, '新增弹窗应打开');
  state.formRef.value = { validate: (cb) => cb() };
  state.formValue.name = '队伍A';
  state.formValue.member1Uid = 'u1';
  state.formValue.member2Uid = 'u2';
  state.formValue.member3Uid = '';
  calls = [];
  state.handleSubmit();
  await tick();
  await tick();
  const post = calls.find((call) => call.url === '/api/admin/contest/team' && call.init?.method === 'POST');
  assert.ok(post, '应 POST /api/admin/contest/team');
  const body = bodyOf(post);
  assert.equal(body.cid, 3);
  assert.equal(body.member1Uid, 'u1');
  assert.equal(body.member2Uid, 'u2');
  assert.equal(body.member3Uid, null);

  state.checkedRowKeys.value = [1, 2];
  calls = [];
  await state.handleBatchDelete();
  const del = calls.find((call) => call.url === '/api/admin/contest/team' && call.init?.method === 'DELETE');
  assert.ok(del, '批量删除应使用 DELETE body');
  assert.deepEqual(bodyOf(del).ids, [1, 2]);
});

await test('队伍列表：服务端分页 total>pageSize 可翻第二页', async () => {
  calls = [];
  responder = (url) =>
    url.startsWith('/api/admin/contest/team?')
      ? json({ list: [{ id: 21, name: 'p2' }], total: 42 })
      : json(null);
  const state = useTeamManage();
  state.selectedCid.value = 1;
  await state.fetchTeams();
  assert.equal(state.pagination.itemCount, 42);
  state.handlePageChange(2);
  await tick();
  const pageCall = calls[calls.length - 1];
  assert.match(pageCall.url, /\/api\/admin\/contest\/team\?/);
  assert.equal(queryOf(pageCall.url).get('page'), '2');
  assert.equal(queryOf(pageCall.url).get('cid'), '1');
});

await test('队伍：切换比赛时用 /api/contests/check 真实查验，无效比赛不拉队伍', async () => {
  calls = [];
  responder = (url) => {
    if (url.startsWith('/api/contests/check')) return json({ valid: false, contestId: null, title: null });
    return json({ list: [{ id: 1, name: 'should-not-load' }], total: 1 });
  };
  const state = useTeamManage();
  state.handleCidChange(99);
  await tick();
  await tick();
  const check = calls.find((call) => call.url.startsWith('/api/contests/check'));
  assert.ok(check, '应调用 /api/contests/check');
  assert.equal(queryOf(check.url).get('cid'), '99');
  assert.equal(state.teamList.value.length, 0, '无效比赛不应加载队伍');
  assert.equal(calls.some((call) => call.url.startsWith('/api/admin/contest/team?')), false);
});

await test('比赛列表：remote 服务端分页 total>pageSize 可翻第二页', async () => {
  calls = [];
  responder = () => json({ list: [{ id: 1, title: 'p2' }], total: 42 });
  const state = useContestList();
  await state.fetchContests();
  assert.equal(state.pagination.itemCount, 42);
  assert.ok(state.pagination.itemCount > state.tableData.value.length);
  state.handlePageChange(2);
  await tick();
  const pageCall = calls[calls.length - 1];
  assert.match(pageCall.url, /\/api\/admin\/contest\/list\?/);
  assert.equal(queryOf(pageCall.url).get('page'), '2');
});

await test('题单列表：remote 服务端分页 total>pageSize 可翻第二页', async () => {
  calls = [];
  responder = () => json({ list: [{ id: 1, title: 'p2' }], total: 42 });
  const state = useTrainingManage();
  await state.fetchTrainings();
  assert.equal(state.pagination.itemCount, 42);
  state.handlePageChange(2);
  await tick();
  const pageCall = calls[calls.length - 1];
  assert.match(pageCall.url, /\/api\/admin\/training\/list\?/);
  assert.equal(queryOf(pageCall.url).get('page'), '2');
});

await test('作业列表：remote 服务端分页 total>pageSize 可翻第二页', async () => {
  calls = [];
  responder = () => json({ list: [{ id: 1, title: 'p2' }], total: 42 });
  const state = useHomeworkList();
  await state.fetchHomeworks();
  assert.equal(state.pagination.itemCount, 42);
  state.handlePageChange(2);
  await tick();
  const pageCall = calls[calls.length - 1];
  assert.match(pageCall.url, /\/api\/admin\/homework\/list\?/);
  assert.equal(queryOf(pageCall.url).get('page'), '2');
});

// 记录切换竞态 + 排序持久化的最小回归（与冻结外部 repro 同源断言）
for (const [kind, factory] of [
  ['contest', useContestForm],
  ['training', useTrainingForm],
  ['homework', useHomeworkForm],
]) {
  const detail = (id) => ({
    id,
    title: 'record' + id,
    type: kind === 'training' ? 'Official' : 'ACM',
    auth: 'Public',
    status: false,
    description: 'body',
    timeRange: [1700000000000, 1700003600000],
    classIds: [1],
    problems: [
      { problemId: id, displayId: kind === 'training' ? id : String.fromCharCode(64 + id) },
    ],
  });

  await test(`${kind}：详情元数据迟到不得覆盖当前记录`, async () => {
    let release;
    responder = (url) => {
      if (url.startsWith('/api/admin/' + kind + '/')) return json(detail(Number(url.split('/').pop())));
      if (url.startsWith('/api/problems/check')) {
        const id = Number(queryOf(url).get('problemId'));
        if (id === 1) {
          return new Promise((resolve) => {
            release = () => resolve(json({ exists: true, title: 'one' }));
          });
        }
        return json({ exists: true, title: 'two' });
      }
      return json([]);
    };
    const state = factory();
    const old = state.loadData(1);
    await tick();
    await state.loadData(2);
    release();
    await old;
    assert.equal(state.formValue.title, 'record2');
    assert.equal(state.formValue.problems[0].problemId, 2);
  });

  await test(`${kind}：未完整加载的记录不得保存到其他 id`, async () => {
    responder = (url) =>
      url.startsWith('/api/admin/' + kind + '/')
        ? json(detail(1))
        : url.startsWith('/api/problems/check')
          ? json({ exists: true, title: 'one' })
          : json([]);
    const state = factory();
    await state.loadData(1);
    calls = [];
    await state.handleSubmit(true, 2);
    assert.equal(calls.filter((call) => call.init?.method === 'PUT').length, 0);
  });

  await test(`${kind}：新详情加载失败不得保存旧表单`, async () => {
    responder = (url) =>
      url.endsWith('/2')
        ? json(null, 404)
        : url.startsWith('/api/admin/' + kind + '/')
          ? json(detail(1))
          : url.startsWith('/api/problems/check')
            ? json({ exists: true, title: 'one' })
            : json([]);
    const state = factory();
    await state.loadData(1);
    await state.loadData(2);
    calls = [];
    await state.handleSubmit(true, 2);
    assert.equal(calls.filter((call) => call.init?.method === 'PUT').length, 0);
  });

  await test(`${kind}：迟到的题目添加不得跨记录写入`, async () => {
    let release;
    responder = (url) => {
      if (url.startsWith('/api/problems/check') && queryOf(url).get('problemId') === '99') {
        return new Promise((resolve) => {
          release = () => resolve(json({ exists: true, title: 'late' }));
        });
      }
      if (url.startsWith('/api/admin/' + kind + '/')) return json(detail(2));
      if (url.startsWith('/api/problems/check')) return json({ exists: true, title: 'two' });
      return json([]);
    };
    const state = factory();
    state.problemInput.value = '99';
    const old = state.handleAddProblem();
    await tick();
    await state.loadData(2);
    release();
    await old;
    assert.deepEqual(
      state.formValue.problems.map((p) => p.problemId),
      [2],
    );
  });

  await test(`${kind}：切换记录后旧保存不得卡住新记录保存态`, async () => {
    let release;
    responder = (url, init) =>
      init?.method === 'PUT'
        ? new Promise((resolve) => {
            release = () => resolve(json(null));
          })
        : url.startsWith('/api/admin/')
          ? json(detail(Number(url.split('/').pop())))
          : json([]);
    const state = factory();
    await state.loadData(1);
    pushes.length = 0;
    const pending = state.handleSubmit(true, 1);
    await tick();
    await state.loadData(2);
    release();
    await pending;
    assert.equal(pushes.length, 0, '旧保存完成后不得导航');
    assert.equal(state.saving.value, false, '新记录必须保持可保存');
  });
}

await test('比赛题目：下移交换 displayId 后按编号排序反映新顺序', async () => {
  calls = [];
  responder = () => json(null);
  const state = useContestForm();
  state.formValue.title = '排序赛';
  state.formValue.timeRange = [1700000000000, 1700003600000];
  state.formValue.problems = [
    { problemId: 11, problemCode: 'P11', displayId: 'A', displayTitle: 'A题', color: null },
    { problemId: 12, problemCode: 'P12', displayId: 'B', displayTitle: 'B题', color: null },
  ];
  state.handleMoveDown(0);
  await state.handleSubmit(false);
  const post = calls.find((call) => call.url === '/api/admin/contest' && call.init?.method === 'POST');
  assert.ok(post, '应 POST 保存比赛');
  const body = bodyOf(post);
  const sorted = [...body.problems].sort((a, b) =>
    String(a.displayId).localeCompare(String(b.displayId)),
  );
  assert.deepEqual(sorted.map((p) => p.problemId), [12, 11], '排序后应反映新顺序');
  assert.deepEqual(body.problems.map((p) => p.displayId).sort(), ['A', 'B'], '标签集合保持不变');
});

await test('比赛题目：仅改标题不重排自定义展示编号', async () => {
  calls = [];
  responder = () => json(null);
  const state = useContestForm();
  state.formValue.title = '只改标题';
  state.formValue.timeRange = [1, 2];
  state.formValue.problems = [
    { problemId: 11, problemCode: 'P11', displayId: 'C', displayTitle: 'A题', color: null },
    { problemId: 12, problemCode: 'P12', displayId: 'A', displayTitle: 'B题', color: null },
  ];
  await state.handleSubmit(false);
  const post = calls.find((call) => call.url === '/api/admin/contest' && call.init?.method === 'POST');
  const body = bodyOf(post);
  assert.deepEqual(
    body.problems.map((p) => p.displayId),
    ['C', 'A'],
    '仅改标题不得重排自定义展示编号',
  );
});

await test('题单题目：数字 displayId 上移交换后排序反映新顺序', async () => {
  calls = [];
  responder = () => json(null);
  const state = useTrainingForm();
  state.formValue.title = '排序题单';
  state.formValue.type = 'Official';
  state.formValue.auth = 'Public';
  state.formValue.problems = [
    { problemId: 11, problemCode: 'P11', displayId: 1, displayTitle: 'A' },
    { problemId: 12, problemCode: 'P12', displayId: 2, displayTitle: 'B' },
  ];
  state.handleMoveUp(1);
  await state.handleSubmit(false);
  const post = calls.find((call) => call.url === '/api/admin/training' && call.init?.method === 'POST');
  assert.ok(post, '应 POST 保存题单');
  const body = bodyOf(post);
  const sorted = [...body.problems].sort((a, b) => a.displayId - b.displayId);
  assert.deepEqual(sorted.map((p) => p.problemId), [12, 11]);
  assert.ok(body.problems.every((p) => Number.isInteger(p.displayId) && p.displayId >= 1));
});

await test('作业题目：下移交换 displayId 后按编号排序反映新顺序', async () => {
  calls = [];
  responder = () => json(null);
  const state = useHomeworkForm();
  state.formValue.title = '排序作业';
  state.formValue.timeRange = [1700000000000, 1700003600000];
  state.formValue.targetClassIds = [1];
  state.formValue.problems = [
    { problemId: 11, problemCode: 'P11', displayId: 'A', displayTitle: 'A题' },
    { problemId: 12, problemCode: 'P12', displayId: 'B', displayTitle: 'B题' },
  ];
  state.handleMoveDown(0);
  await state.handleSubmit(false);
  const post = calls.find((call) => call.url === '/api/admin/homework' && call.init?.method === 'POST');
  assert.ok(post, '应 POST 保存作业');
  const body = bodyOf(post);
  const sorted = [...body.problems].sort((a, b) =>
    String(a.displayId).localeCompare(String(b.displayId)),
  );
  assert.deepEqual(sorted.map((p) => p.problemId), [12, 11]);
  assert.deepEqual(body.problems.map((p) => p.displayId).sort(), ['A', 'B']);
});

await test('队伍：迟到的无效比赛查验不得清空当前比赛列表', async () => {
  let release;
  responder = (url) =>
    url.startsWith('/api/contests/check')
      ? queryOf(url).get('cid') === '1'
        ? new Promise((resolve) => {
            release = () => resolve(json({ valid: false }));
          })
        : json({ valid: true })
      : json({ list: [{ id: 2, cid: 2, name: 'new' }], total: 1 });
  const state = useTeamManage();
  state.handleCidChange(1);
  state.handleCidChange(2);
  await tick();
  await tick();
  release();
  await tick();
  assert.equal(state.teamList.value[0]?.cid, 2);
});

await test('队伍：A→B→A 旧列表响应不得回填，也不得清除 loading', async () => {
  let oldList;
  responder = (url) =>
    url.startsWith('/api/contests/check')
      ? new Promise(() => {}) // 当前查验保持挂起
      : new Promise((resolve) => {
          oldList = () => resolve(json({ list: [{ id: 1, cid: 1, name: 'stale' }], total: 1 }));
        });
  const state = useTeamManage();
  state.selectedCid.value = 1;
  const pending = state.fetchTeams();
  state.handleCidChange(2);
  state.handleCidChange(1);
  oldList();
  await pending;
  assert.deepEqual(state.teamList.value, [], 'A→B→A 时旧 A 列表不得回填');
  assert.equal(state.loading.value, true, '新查验未完成前 loading 不得被旧请求清除');
});

await test('队伍：公开 check 无效但管理详情存在时，停用比赛仍可管理', async () => {
  calls = [];
  responder = (url) => {
    if (url.startsWith('/api/contests/check')) return json({ valid: false, contestId: 7, title: null });
    if (url === '/api/admin/contest/7') return json({ id: 7, title: '停用比赛', status: false });
    if (url.startsWith('/api/admin/contest/team?')) {
      return json({ list: [{ id: 1, cid: 7, name: 'retained' }], total: 1 });
    }
    return json(null);
  };
  const state = useTeamManage();
  state.handleCidChange(7);
  await tick();
  await tick();
  await tick();
  assert.equal(calls.some((call) => call.url === '/api/admin/contest/7'), true, '应回退管理详情');
  assert.equal(state.teamList.value[0]?.cid, 7, '停用比赛仍应加载队伍列表');
});

await test('队伍：公开 check 无效且管理详情 404 时不加载列表', async () => {
  calls = [];
  responder = (url) => {
    if (url.startsWith('/api/contests/check')) return json({ valid: false, contestId: null, title: null });
    if (url.startsWith('/api/admin/contest/team?')) {
      return json({ list: [{ id: 1, cid: 9, name: 'nope' }], total: 1 });
    }
    return json(null, 404);
  };
  const state = useTeamManage();
  state.handleCidChange(9);
  await tick();
  await tick();
  await tick();
  assert.equal(state.teamList.value.length, 0, '不可访问比赛不应加载队伍');
  assert.equal(calls.some((call) => call.url.startsWith('/api/admin/contest/team?')), false);
});

await test('队伍：关闭弹窗后延迟校验不得再提交', async () => {
  let validate;
  responder = () => json(null);
  const state = useTeamManage();
  state.selectedCid.value = 1;
  state.handleAdd();
  state.formValue.name = 'team';
  state.formValue.member1Uid = 'u1';
  state.formRef.value = { validate: (cb) => { validate = cb; } };
  state.handleSubmit();
  state.showModal.value = false; // 模拟遮罩/Esc 关闭，不经过 closeModal
  await tick();
  calls = [];
  validate();
  await tick();
  assert.equal(calls.filter((call) => call.init?.method === 'POST').length, 0, '关闭后不得发送 POST');
});

await test('比赛模式：系统时间统一按本地时区格式化（跨零点日期正确）', async () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Asia/Shanghai';
  try {
    const timestamp = Date.UTC(2024, 0, 1, 16, 0, 0); // 北京时间 2024-01-02 00:00
    const text = formatSystemTime(timestamp);
    assert.equal(text, '2024/01/02 00:00:00');
    assert.notEqual(text.slice(0, 10), '2024-01-01', '不得混用 UTC 日期');
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

await test('编辑表单：详情未加载完成前不渲染可编辑表单（避免草稿被回填覆盖）', async () => {
  const files = [
    'src/views/admin/ContestManage/ContestList/components/ContestEdit.vue',
    'src/views/admin/TrainingManage/TrainingList/components/TrainingEdit.vue',
    'src/views/admin/HomeworkManage/HomeworkList/components/HomeworkEdit.vue',
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf-8');
    assert.match(source, /<n-form\s+v-if="loadedDetailId"/, `${file} 应在 loadedDetailId 后才渲染表单`);
    assert.match(source, /v-if="!loadedDetailId && !detailError"/, `${file} 应显示加载态`);
    assert.match(source, /detailError/, `${file} 应保留错误反馈`);
  }
});

console.log(failures ? `\n${failures} checks FAILED` : '\nall admin-business behavior checks passed');
process.exitCode = failures ? 1 : 0;
