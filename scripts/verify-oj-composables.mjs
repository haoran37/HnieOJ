// OJ composable 行为回归：真实调用 useStatusDetail / toLocalDateTime，验证
// 卸载与同 ID 刷新作废、轮询错误显式、cases 错误不伪装空数据、MAX_POLLS 可见，
// 以及 LocalDateTime 不被 toISOString 剪切时区。
// 运行：node scripts/verify-oj-composables.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// 固定时区，制造与 UTC 的差异以暴露 toISOString 剪切问题（Node 支持动态 TZ）
process.env.TZ = 'Asia/Shanghai';

const root = process.cwd();
const req = createRequire(root + '/package.json');
globalThis.__vue = req('vue');

const unmountFns = [];
globalThis.__captureUnmount = (fn) => {
  unmountFns.push(fn);
};

const vueStub =
  'data:text/javascript,' +
  encodeURIComponent(
    'export const ref=globalThis.__vue.ref; export const onUnmounted=globalThis.__captureUnmount;',
  );

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'vue' && context.parentURL?.endsWith('/useStatusDetail.ts')) {
      return { url: vueStub, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      return next(pathToFileURL(path.join(root, 'src', specifier.slice(2) + '.ts')).href, context);
    }
    return next(specifier, context);
  },
});

// ---- 可控 fetch ----
const handlers = [];
let autoHandler = null;
globalThis.fetch = (url) => {
  const target = String(url);
  if (autoHandler) return autoHandler(target);
  const handler = handlers.shift();
  if (!handler) throw new Error(`unexpected fetch: ${target}`);
  return handler(target);
};
function json(body, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}
function detailData(overrides = {}) {
  return {
    code: 200,
    data: {
      submissionId: 'S',
      problemCode: 'P',
      uid: 'uid-1',
      username: 'alice',
      language: 'cpp',
      status: -8,
      statusText: null,
      time: 5,
      memory: 1024,
      score: 0,
      contestId: null,
      totalCase: 1,
      judgedCase: 1,
      currentCase: 1,
      errorMessage: null,
      diagnosticMessage: null,
      judger: null,
      code: 'int main(){}',
      gmtCreate: '2026-09-20T12:00:00',
      gmtModified: '2026-09-20T12:00:01',
      ...overrides,
    },
  };
}
function casesData(list) {
  return { code: 200, data: list };
}

// ---- 可控计时器 ----
const scheduled = [];
const realSetImmediate = globalThis.setImmediate;
globalThis.setTimeout = (fn) => {
  scheduled.push(fn);
  return scheduled.length;
};
globalThis.clearTimeout = () => {};

const tick = () => new Promise((resolve) => realSetImmediate(resolve));

const { useStatusDetail } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useStatusDetail.ts'))
);
const { toLocalDateTime } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useRejudge.ts'))
);

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

await check('卸载后迟到的详情响应不得再排计时器', async () => {
  scheduled.length = 0;
  handlers.length = 0;
  let resolveDetail;
  handlers.push(
    () => new Promise((resolve) => (resolveDetail = () => resolve(json(detailData({ status: -10 }))))),
  );
  const state = useStatusDetail();
  const promise = state.fetchStatusDetail('abc');
  const unmount = unmountFns[unmountFns.length - 1];
  unmount();
  resolveDetail();
  await promise;
  assert.equal(scheduled.length, 0, '卸载后不应再排轮询计时器');
});

await check('同 ID 刷新作废更早的在途请求', async () => {
  scheduled.length = 0;
  handlers.length = 0;
  const deferred = [];
  handlers.push(
    () => new Promise((resolve) => deferred.push(() => resolve(json(detailData({ status: -8 }))))),
    () => new Promise((resolve) => deferred.push(() => resolve(json(detailData({ status: 0 }))))),
  );
  const state = useStatusDetail();
  const first = state.fetchStatusDetail('B');
  const second = state.fetchStatusDetail('B');
  deferred[1]();
  await second;
  assert.equal(state.detail.value?.status, 'Accepted');
  deferred[0]();
  await first;
  assert.equal(state.detail.value?.status, 'Accepted', '旧请求结果不得覆盖新请求');
  assert.equal(scheduled.length, 0, '终态不应继续轮询');
});

await check('轮询失败显式报错并停止，保留最后一次详情', async () => {
  scheduled.length = 0;
  handlers.length = 0;
  handlers.push(() => json(detailData({ status: -8 })), () => casesData([]));
  const state = useStatusDetail();
  await state.fetchStatusDetail('C');
  assert.equal(scheduled.length, 1, '评测中应安排一次轮询');
  handlers.push(() => json({ code: 200, msg: 'boom' }, 500));
  scheduled.shift()();
  await tick();
  assert.ok(state.pollError.value, '轮询失败应有可观察错误');
  assert.ok(state.detail.value, '轮询失败应保留最后一次详情');
  assert.equal(scheduled.length, 0, '轮询失败后应停止自动轮询');
  assert.equal(state.exhausted.value, false);
});

await check('测试点请求失败不伪装为空数据', async () => {
  scheduled.length = 0;
  handlers.length = 0;
  handlers.push(() => json(detailData({ status: 0 })), () => json({ code: 500, msg: 'cases down' }, 500));
  const state = useStatusDetail();
  await state.fetchStatusDetail('D');
  assert.ok(state.casesError.value, 'cases 失败应显式暴露');
  assert.ok(state.detail.value, '详情本身仍应展示');
  assert.equal(state.detail.value?.status, 'Accepted');
});

// 恢复必须走真实静默轮询路径：非静默入口会在 load 开始处把 casesError 置空，
// 在公开 fetch 上验证会被入口重置掩盖，无法证明“后续成功清除旧错误”这一修复。
await check('静默轮询成功后必须清除 casesError（不靠入口重置）', async () => {
  scheduled.length = 0;
  handlers.length = 0;
  handlers.push(() => json(detailData({ status: -8 })), () => json({ code: 500, msg: 'cases down' }, 500));
  const state = useStatusDetail();
  await state.fetchStatusDetail('D2');
  assert.ok(state.casesError.value, '首次 cases 失败应暴露错误');
  assert.equal(scheduled.length, 1, '评测中应安排一次静默轮询');

  handlers.push(() => json(detailData({ status: 0 })), () => json(casesData([{ caseId: '1', status: 0, score: 100, time: 1, memory: 1 }])));
  scheduled.shift()();
  for (let i = 0; i < 20 && state.detail.value?.testPoints.length !== 1; i += 1) {
    await tick();
  }
  assert.equal(state.casesError.value, null, '静默轮询成功必须清除旧的 casesError');
  assert.equal(state.detail.value?.testPoints.length, 1, '成功结果应写入详情');
});

await check('达到 MAX_POLLS 时显式暴露 exhausted 而不是无声卡住', async () => {
  scheduled.length = 0;
  handlers.length = 0;
  autoHandler = (target) =>
    target.endsWith('/cases') ? casesData([]) : json(detailData({ status: -8 }));
  const state = useStatusDetail();
  await state.fetchStatusDetail('E');
  let guard = 0;
  while (scheduled.length > 0 && guard < 1000) {
    scheduled.shift()();
    await tick();
    guard += 1;
  }
  autoHandler = null;
  assert.equal(state.exhausted.value, true, `应在 MAX_POLLS 处显式暴露，实际 guard=${guard}`);
  assert.equal(guard, 400, '应在 400 次轮询后停止');
  assert.equal(scheduled.length, 0, '达到上限后不应再排计时器');
});

await check('LocalDateTime 保留本地墙上时间，不被 toISOString 剪切时区', async () => {
  const ms = Date.UTC(2026, 0, 2, 3, 4, 5);
  const text = toLocalDateTime(ms);
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const expected = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  assert.equal(text, expected, '应使用本地日期组件');
  assert.notEqual(text, new Date(ms).toISOString().slice(0, 19), '不应等同于 UTC 剪切');
  assert.equal(text, '2026-01-02T11:04:05', 'Asia/Shanghai 应为 UTC+8');
});

console.log(`\n${passed} oj composable behavior checks passed`);
