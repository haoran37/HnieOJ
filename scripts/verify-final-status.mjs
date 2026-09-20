// 最终接口状态诚实展示回归：
// - userStore 未查询到做题记录时返回未知，绝不伪称“未开始”/0 题；
// - statusUtils 未知状态文案准确，AC/WA 映射保留；
// - useDashboard 区分初次加载 / 真实 0 / 读取失败 / 重试恢复，失败不称“暂未开放”。
// 运行：node scripts/verify-final-status.mjs（在仓库根目录）
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const dataUrl = (code) => 'data:text/javascript,' + encodeURIComponent(code);

// localStorage 桩：userStore 实例化时读取 token
globalThis.localStorage = { getItem: () => null, removeItem: () => {}, setItem: () => {} };

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'naive-ui') {
      return { shortCircuit: true, url: dataUrl('export const NIcon={};') };
    }
    if (specifier.startsWith('@/')) {
      let file = path.join(srcRoot, specifier.slice(2));
      if (!path.extname(file)) file += '.ts';
      return next(pathToFileURL(file).href, context);
    }
    return next(specifier, context);
  },
});

const json = (data, status = 200) =>
  new Response(
    JSON.stringify({ code: status === 200 ? 200 : status, msg: status === 200 ? 'success' : 'error', data }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );

let responder = async () => json({ list: [], total: 0 });
const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  return responder(String(url), init);
};

let failures = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + ': ' + (error && error.message));
  }
}

// ---- statusUtils 纯映射 ----
const { getStatusConfig, renderStatusIcon } = await import(
  pathToFileURL(path.join(srcRoot, 'utils/statusUtils.ts'))
);

await test('未知做题状态文案准确，AC/WA 映射保留', () => {
  assert.equal(getStatusConfig('AC').label, '已通过');
  assert.equal(getStatusConfig('WA').label, '未通过');
  assert.notEqual(getStatusConfig('UNKNOWN').label, '未开始');
  assert.notEqual(getStatusConfig(undefined).label, '未开始');
  assert.equal(getStatusConfig('UNKNOWN').color, '#ccc');
  assert.equal(renderStatusIcon('UNKNOWN').props.title, '状态未知');
  assert.equal(renderStatusIcon('AC').props['aria-label'], '已通过');
});

// ---- userStore ----
const { createPinia, setActivePinia } = await import('pinia');
const { useUserStore } = await import(pathToFileURL(path.join(srcRoot, 'stores/userStore.ts')));
setActivePinia(createPinia());

await test('userStore 未查询到做题记录返回未知，已有 AC/WA 映射保留', () => {
  const store = useUserStore();
  assert.equal(store.getProblemStatus('1000'), 'UNKNOWN');
  store.acceptedProblems.add('1000');
  assert.equal(store.getProblemStatus('1000'), 'AC');
  store.wrongProblems.add('1001');
  assert.equal(store.getProblemStatus('1001'), 'WA');
});

// ---- useDashboard ----
const { useDashboard, dashboardMetricState } = await import(
  pathToFileURL(path.join(srcRoot, 'composables/admin/useDashboard.ts'))
);

await test('dashboard 状态映射区分加载/真实值/失败/暂未开放', () => {
  assert.equal(dashboardMetricState(0, false, false), 'value');
  assert.equal(dashboardMetricState(12, false, false), 'value');
  assert.equal(dashboardMetricState(null, false, false), 'unavailable');
  assert.equal(dashboardMetricState(null, true, false), 'error');
  assert.equal(dashboardMetricState(0, false, true), 'loading');
});

await test('dashboard 首次加载真实 total=0 显示 0 而非暂未开放', async () => {
  responder = async () => json({ list: [], total: 0 });
  const state = useDashboard();
  await state.fetchData();
  assert.equal(state.error.value, null);
  assert.equal(state.totals.value.totalUsers, 0);
  assert.equal(state.totals.value.totalSubmissions, 0);
  for (const key of Object.keys(state.failed.value)) {
    assert.equal(state.failed.value[key], false, key + ' 不应标记失败');
  }
});

await test('dashboard 读取失败标记 error 且不沿用旧成功值', async () => {
  responder = async () => json({ list: [], total: 5 });
  const state = useDashboard();
  await state.fetchData();
  assert.equal(state.totals.value.totalUsers, 5);
  // 第二次：用户接口失败，其余成功
  responder = async (url) =>
    url.startsWith('/api/user/users') ? json(null, 500) : json({ list: [], total: 7 });
  await state.fetchData();
  assert.ok(state.error.value, '外层必须暴露错误');
  assert.equal(state.totals.value.totalUsers, null, '失败项不得沿用旧值');
  assert.equal(state.failed.value.totalUsers, true);
  assert.equal(
    dashboardMetricState(state.totals.value.totalUsers, state.failed.value.totalUsers, false),
    'error',
  );
  assert.notEqual(
    dashboardMetricState(state.totals.value.totalUsers, state.failed.value.totalUsers, false),
    'unavailable',
  );
  assert.equal(state.totals.value.totalProblems, 7);
});

await test('dashboard 重试成功后恢复真实值并清除错误', async () => {
  responder = async () => json({ list: [], total: 3 });
  const state = useDashboard();
  await state.fetchData();
  assert.equal(state.error.value, null);
  assert.equal(state.totals.value.totalUsers, 3);
  assert.equal(state.failed.value.totalUsers, false);
});

console.log(failures ? `\n${failures} checks FAILED` : '\nall final-status honesty checks passed');
process.exitCode = failures ? 1 : 0;
