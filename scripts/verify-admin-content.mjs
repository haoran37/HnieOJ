// 本批（题目资源/讨论/公告/outbox 管理真实接线）行为回归：
// 直接实例化真实 composable，用受控 HTTP 响应验证草稿保护、旧响应隔离、
// 受保护管理端详情、创建/编辑载荷与分页 total。
// 运行：node scripts/verify-admin-content.mjs（在仓库根目录）
import assert from 'node:assert/strict';
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
globalThis.__user = { isAdmin: true };
globalThis.__route = reactive({ params: { id: '1' }, query: {} });

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'naive-ui') {
      return { shortCircuit: true, url: dataUrl('export const useMessage=()=>globalThis.__msg;') };
    }
    if (specifier === 'vue-router') {
      return {
        shortCircuit: true,
        url: dataUrl(
          'export const useRoute=()=>globalThis.__route;' +
            'export const useRouter=()=>({push:async()=>{},replace:async()=>{},back:()=>{}});',
        ),
      };
    }
    if (specifier === '@/stores/userStore') {
      return { shortCircuit: true, url: dataUrl('export const useUserStore=()=>globalThis.__user;') };
    }
    if (specifier.startsWith('@/')) {
      let file = path.join(root, 'src', specifier.slice(2));
      if (!path.extname(file)) file += '.ts';
      return next(pathToFileURL(file).href, context);
    }
    return next(specifier, context);
  },
});

globalThis.localStorage = { getItem: () => null, removeItem: () => {} };

const json = (data, status = 200) =>
  new Response(JSON.stringify({ code: status === 200 ? 200 : status, msg: status === 200 ? 'success' : 'error', data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let responder = async () => json(null);
let calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  return responder(String(url), init);
};

const lastCall = () => calls[calls.length - 1];
const bodyOf = (call) => JSON.parse(String(call.init?.body));

const { useAnnouncement } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useAnnouncement.ts'))
);
const { useDiscussManage } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useDiscussManage.ts'))
);
const { useProblemForm } = await import(
  pathToFileURL(path.join(root, 'src/composables/admin/useProblemForm.ts'))
);
const { useDiscussAdd } = await import(
  pathToFileURL(path.join(root, 'src/composables/oj/useDiscussAdd.ts'))
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

await test('公告列表：选择第二页后 remote total>pageSize 且请求 page=2', async () => {
  calls = [];
  responder = async () => json({ list: [{ id: 31, title: 'p2', status: 1 }], total: 42 });
  const state = useAnnouncement();
  await state.fetchAnnouncements();
  // 真实触发翻页，而不是只断言总数
  state.handlePageChange(2);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.pagination.page, 2);
  assert.equal(state.pagination.itemCount, 42);
  assert.ok(state.pagination.itemCount > state.announcements.value.length);
  const pageCall = lastCall();
  assert.match(pageCall.url, /\/api\/admin\/announcements\?/);
  assert.match(pageCall.url, /[?&]page=2(&|$)/);
});

await test('公告编辑：走受保护管理端详情，最后一次选择不被旧响应覆盖', async () => {
  let releaseFirst;
  responder = (url) => {
    if (url.endsWith('/1')) return new Promise((resolve) => { releaseFirst = resolve; });
    if (url.endsWith('/2')) return json({ id: 2, title: 'second', content: 'b2', status: 1 });
    return json({ list: [], total: 0 });
  };
  const state = useAnnouncement();
  const pending = state.openEditModal({ id: 1, title: 'first' });
  await state.openEditModal({ id: 2, title: 'second' });
  releaseFirst(json({ id: 1, title: 'first', content: 'b1', status: 1 }));
  await pending;
  assert.equal(state.formModel.id, 2);
  assert.equal(state.formModel.title, 'second');
  assert.match(calls.find((call) => call.url.endsWith('/2')).url, /\/api\/admin\/announcements\/2$/);
});

await test('公告新建：作废在途编辑详情，保留新建草稿', async () => {
  let releaseFirst;
  responder = (url) =>
    url.endsWith('/1') ? new Promise((resolve) => { releaseFirst = resolve; }) : json({ list: [], total: 0 });
  const state = useAnnouncement();
  const pending = state.openEditModal({ id: 1, title: 'old' });
  state.openCreateModal();
  state.formModel.title = 'draft';
  releaseFirst(json({ id: 1, title: 'old', content: 'old', status: 0 }));
  await pending;
  assert.equal(state.modalMode.value, 'create');
  assert.equal(state.formModel.title, 'draft');
});

await test('讨论编辑：受保护管理端详情映射 isTop，保存 PUT 携带 isTop', async () => {
  calls = [];
  const detail = { id: 3, title: 'top', category: 'Site', problemCode: null, content: 'body', status: 0, isTop: true };
  responder = (url, init) => {
    if (init?.method === 'PUT') return json(null);
    if (url.endsWith('/3')) return json(detail);
    return json({ list: [], total: 0 });
  };
  const state = useDiscussManage();
  await state.openEditModal({ id: 3, title: 'top' });
  assert.equal(state.editForm.isTop, true);
  assert.match(calls.find((call) => call.url.endsWith('/3')).url, /\/api\/admin\/discussions\/3$/);
  state.editForm.title = 'top2';
  await state.handleSaveEdit();
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.ok(put, '应发送 PUT');
  assert.equal(bodyOf(put).isTop, true);
});

await test('题目详情：foreign 图片不纳入当前题目管理，空 examples 可标题更新', async () => {
  responder = () =>
    json({
      problem: {
        id: 1,
        problemCode: 'P1',
        title: 'saved',
        description: 'draft ![o](/oj/images/99/o.png)',
        examples: [],
      },
      tags: [],
    });
  const state = useProblemForm();
  await state.fetchDetail(1);
  assert.deepEqual(state.problemImages.value, []);
  state.problem.title = 'renamed';
  calls = [];
  responder = () => json({ problem: { id: 1, problemCode: 'P1', title: 'renamed', examples: [] }, tags: [] });
  await state.handleSubmit();
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.ok(put, '空 examples 的标题更新应发送 PUT');
  assert.deepEqual(bodyOf(put).problem.examples, []);
});

await test('题目详情：四个 Markdown 字段 null 归一为空串，非 null 文本原样保留且空 examples 仍可保存', async () => {
  // 后端 ProblemRequest 的 description/input/output/hint 可为 null；它们绑定 v-md-editor，
  // 必须是字符串，否则编辑页渲染崩溃。回归同时覆盖空 examples 的标题更新仍走 PUT。
  responder = () =>
    json({
      problem: {
        id: 1,
        problemCode: 'P1',
        title: 'nullable',
        description: null,
        input: null,
        output: null,
        hint: null,
        examples: [],
      },
      tags: [],
    });
  const state = useProblemForm();
  await state.fetchDetail(1);
  assert.equal(state.problem.description, '');
  assert.equal(state.problem.input, '');
  assert.equal(state.problem.output, '');
  assert.equal(state.problem.hint, '');
  assert.equal(typeof state.problem.description, 'string');
  assert.equal(typeof state.problem.input, 'string');
  assert.equal(typeof state.problem.output, 'string');
  assert.equal(typeof state.problem.hint, 'string');

  state.problem.title = 'renamed after null';
  calls = [];
  responder = () => json({ problem: { id: 1, problemCode: 'P1', title: 'renamed after null', examples: [] }, tags: [] });
  await state.handleSubmit();
  const put = calls.find((call) => call.init?.method === 'PUT');
  assert.ok(put, 'null 归一后空 examples 的标题更新应发送 PUT');
  assert.equal(bodyOf(put).problem.description, '');
  assert.deepEqual(bodyOf(put).problem.examples, []);

  responder = () =>
    json({
      problem: {
        id: 1,
        problemCode: 'P1',
        title: 'text',
        description: 'keep **markdown**',
        input: '1 2',
        output: '3 4',
        hint: 'hint text',
        examples: [{ input: '1', output: '1' }],
      },
      tags: [],
    });
  const preserved = useProblemForm();
  await preserved.fetchDetail(1);
  assert.equal(preserved.problem.description, 'keep **markdown**');
  assert.equal(preserved.problem.input, '1 2');
  assert.equal(preserved.problem.output, '3 4');
  assert.equal(preserved.problem.hint, 'hint text');
});

await test('题目图片删除：保留未保存标题/标签，仅移除当前题目的引用', async () => {
  responder = () =>
    json({
      problem: {
        id: 1,
        problemCode: 'P1',
        title: 'saved',
        description: 'saved ![a](/oj/images/1/a.png)',
        examples: [{ input: '1', output: '1' }],
      },
      tags: ['old'],
    });
  const state = useProblemForm();
  await state.fetchDetail(1);
  state.problem.title = 'draft';
  state.tags.value = ['draft'];
  responder = (_url, init) => (init?.method === 'DELETE' ? json(null) : json(null));
  await state.handleDeleteImage('a.png');
  assert.equal(state.problem.title, 'draft');
  assert.deepEqual(state.tags.value, ['draft']);
  assert.ok(!state.problem.description.includes('/oj/images/1/a.png'));
  assert.deepEqual(state.problemImages.value, []);
});

await test('题目图片上传：切换题目后丢弃过期上传结果', async () => {
  let releaseUpload;
  responder = (url) => json({ problem: { id: Number(url.match(/problem\/(\d+)/)?.[1] ?? 1), problemCode: 'P', title: 't', description: '', examples: [] }, tags: [] });
  const state = useProblemForm();
  await state.fetchDetail(1);
  responder = (_url, init) =>
    init?.method === 'POST' ? new Promise((resolve) => { releaseUpload = resolve; }) : json({ problem: { id: 2, problemCode: 'P2', title: 't2', description: '', examples: [] }, tags: [] });
  const pending = state.handleUploadImage(new File(['a'], 'a.png'));
  await state.fetchDetail(2);
  releaseUpload(json('/oj/images/1/new.png'));
  await pending;
  assert.ok(!state.problem.description.includes('/oj/images/1/new.png'));
});

await test('题目图片上传：离开又回到同一题目后丢弃上一次访问的上传结果', async () => {
  let releaseUpload;
  const detail = (id) => ({
    problem: {
      id,
      problemCode: 'P' + id,
      title: 'saved',
      description: `saved ![a](/oj/images/${id}/a.png)`,
      examples: [{ input: '1', output: '1' }],
    },
    tags: [],
  });
  responder = (url, init) =>
    init?.method === 'POST'
      ? json('/oj/images/1/old.png')
      : json(detail(Number(url.match(/problem\/(\d+)/)?.[1] ?? 1)));
  const state = useProblemForm();
  await state.fetchDetail(1);
  responder = (url, init) =>
    init?.method === 'POST'
      ? new Promise((resolve) => { releaseUpload = resolve; })
      : json(detail(Number(url.match(/problem\/(\d+)/)?.[1] ?? 1)));
  const pending = state.handleUploadImage(new File(['a'], 'a.png'));
  await state.fetchDetail(2);
  await state.fetchDetail(1);
  state.problem.description = 'new visit draft';
  releaseUpload(json('/oj/images/1/old.png'));
  await pending;
  assert.equal(state.problem.description, 'new visit draft');
});

await test('题目保存：离开又回到同一题目后不用过期保存结果重载新草稿', async () => {
  let releaseSave;
  const detail = (id) => ({
    problem: {
      id,
      problemCode: 'P' + id,
      title: 'saved',
      description: '',
      examples: [{ input: '1', output: '1' }],
    },
    tags: [],
  });
  responder = (url, init) =>
    init?.method === 'PUT'
      ? new Promise((resolve) => { releaseSave = resolve; })
      : json(detail(Number(url.match(/problem\/(\d+)/)?.[1] ?? 1)));
  const state = useProblemForm();
  await state.fetchDetail(1);
  const pending = state.handleSubmit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await state.fetchDetail(2);
  await state.fetchDetail(1);
  state.problem.title = 'new visit draft';
  releaseSave(json(null));
  await pending;
  assert.equal(state.problem.title, 'new visit draft');
});

await test('站内讨论创建：不发送 isTop（后端对 isTop=true 一律 403）', async () => {
  calls = [];
  responder = () => json({ id: 5 });
  globalThis.__route.params.id = null;
  globalThis.__route.query = {};
  const state = useDiscussAdd();
  state.formRef.value = { validate: async () => {} };
  state.formValue.value.category = 'Site';
  state.formValue.value.title = 'announce';
  state.formValue.value.content = 'body';
  await state.handlePublish();
  const post = calls.find((call) => call.url === '/api/discussions');
  assert.ok(post, '应发送 POST /api/discussions');
  const payload = bodyOf(post);
  assert.equal(payload.category, 'Site');
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'isTop'), false);
});

console.log(failures ? `\n${failures} checks FAILED` : '\nall admin-content behavior checks passed');
process.exitCode = failures ? 1 : 0;
