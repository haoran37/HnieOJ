// OJ 新业务回归：直接运行真实 composable，网络与消息组件使用可控桩。
// 运行：node scripts/verify-oj-flows.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, compileScript } from 'vue/compiler-sfc';
import { transformWithEsbuild } from 'vite';

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
const vueUrl = import.meta.resolve('vue');
const { nextTick, reactive } = await import(vueUrl);
const dataUrl = source => 'data:text/javascript,' + encodeURIComponent(source);
const apiNames = [
  'addFavorite', 'checkFavorite', 'removeFavorite', 'getContestScoreboard',
  'getUsers', 'getAdminProblemList', 'getAdminTrainings', 'getAdminContests',
  'getAdminHomeworks', 'getAdminSubmissionDashboard', 'getTopFavoriteTrainings',
  'getSolveRankings', 'getContestRatings', 'getContributionRankings',
];
globalThis.__ojApi = {};
globalThis.__ojMessage = { success() {}, error() {} };
globalThis.__ojStore = reactive({ isLogin: false });
const apiStub = dataUrl(apiNames.map(name =>
  `export const ${name} = (...args) => globalThis.__ojApi.${name}(...args);`).join('\n'));
const messageStub = dataUrl('export const useMessage = () => globalThis.__ojMessage;');
const storeStub = dataUrl('export const useUserStore = () => globalThis.__ojStore;');
const iconStub = dataUrl('export const BarChartOutline = {}; export const RibbonOutline = {};');
const componentStub = dataUrl('export default {};');
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'vue') return { url: vueUrl, shortCircuit: true };
    if (specifier === '@/utils/api') return { url: apiStub, shortCircuit: true };
    if (specifier === 'naive-ui') return { url: messageStub, shortCircuit: true };
    if (specifier === '@/stores/userStore') return { url: storeStub, shortCircuit: true };
    if (specifier === '@vicons/ionicons5') return { url: iconStub, shortCircuit: true };
    if (specifier === '@/components/BoardCard.vue') return { url: componentStub, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      let target = path.join(srcRoot, specifier.slice(2));
      if (!path.extname(target)) target += '.ts';
      return next(pathToFileURL(target).href, context);
    }
    return next(specifier, context);
  },
});
const importTs = name => import(pathToFileURL(path.join(srcRoot, name)).href);
const importSfc = async name => {
  const { descriptor } = parse(fs.readFileSync(path.join(srcRoot, name), 'utf8'));
  const compiled = compileScript(descriptor, { id: name });
  const { code } = await transformWithEsbuild(compiled.content, name + '.ts', { loader: 'ts' });
  return import(dataUrl(code));
};
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

const { useFavorite } = await importTs('composables/oj/useFavorite.ts');
const { useContestScoreboard } = await importTs('composables/oj/useContestScoreboard.ts');
const { useDashboard } = await importTs('composables/admin/useDashboard.ts');

{
  let calls = 0;
  for (const name of ['getSolveRankings', 'getContestRatings', 'getContributionRankings']) {
    globalThis.__ojApi[name] = async () => { calls += 1; return []; };
  }
  for (const name of ['RankListTable', 'TopRatingList', 'TopContributorList']) {
    const component = await importSfc(`views/oj/HomePage/components/${name}.vue`);
    component.default.setup({}, { expose() {} });
  }
  await nextTick();
  assert.equal(calls, 0, '公开首页不应在游客状态请求登录接口');
  console.log('PASS 游客首页不请求需要登录的三个榜单');
}

{
  const oldCheck = deferred();
  globalThis.__ojApi.checkFavorite = () => oldCheck.promise;
  globalThis.__ojApi.addFavorite = async () => null;
  const state = useFavorite('problem', () => '1000');
  await state.toggle();
  oldCheck.resolve(false);
  await nextTick();
  assert.equal(state.saved.value, true, '迟到的收藏状态查询不能撤销成功的收藏');
  console.log('PASS 收藏切换不被旧状态查询覆盖');
}

{
  const first = deferred();
  globalThis.__ojApi.getContestScoreboard = id => id === '1' ? first.promise : Promise.resolve([{ uid: 'new' }]);
  const state = useContestScoreboard();
  const oldRequest = state.fetchScoreboard('1');
  await state.fetchScoreboard('2');
  first.resolve([{ uid: 'old' }]);
  await oldRequest;
  assert.equal(state.rows.value[0].uid, 'new', '旧比赛响应不能覆盖新比赛榜单');
  console.log('PASS 比赛榜单切换忽略旧响应');
}

{
  const favorites = deferred();
  const list = async () => ({ total: 0 });
  for (const name of ['getUsers', 'getAdminProblemList', 'getAdminTrainings', 'getAdminContests', 'getAdminHomeworks']) {
    globalThis.__ojApi[name] = list;
  }
  globalThis.__ojApi.getAdminSubmissionDashboard = async () => ({ totalSubmissions: 0, daily: [], statuses: [] });
  globalThis.__ojApi.getTopFavoriteTrainings = () => favorites.promise;
  const state = useDashboard();
  await state.fetchData();
  assert.equal(state.loading.value, false, '收藏统计未返回时总量不应继续加载');
  assert.equal(state.totals.value.totalUsers, 0);
  assert.equal(state.totals.value.totalSubmissions, 0);
  favorites.resolve([]);
  await nextTick();
  console.log('PASS 收藏统计不会阻塞仪表盘总量');
}
