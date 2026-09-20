// 比赛成就管理页（admin/ContestManage/Achievement.vue）最小回归：
// - 真实 API 契约：searchUsers / getUserAchievements / addUserAchievement / deleteUserAchievement
// - 编译真实 Achievement.vue 并驱动 setup，覆盖：用户查询与空/失败状态、显式选择用户、
//   成就分页加载、添加（内容必填/失败保留/防重复/目标绑定）、删除（确认绑定/失败保留/正确页）、
//   迟到请求不覆盖当前用户、显式空状态、proofUrl scheme 限制与审核入口保留。
// 运行：node scripts/verify-contest-achievement.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import {
  addUserAchievement,
  deleteUserAchievement,
  getUserAchievements,
  searchUsers,
} from '../src/utils/api.ts'

let passed = 0
function check(name, fn) {
  fn()
  passed += 1
  console.log(`PASS ${name}`)
}
async function checkAsync(name, fn) {
  await fn()
  passed += 1
  console.log(`PASS ${name}`)
}

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url))
const componentFile = path.join(srcRoot, 'views/admin/ContestManage/Achievement.vue')

// ---- 真实 fetch / localStorage 桩：验证 API 契约 ----
const calls = []
const storage = new Map([['token', 'real-token']])
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}
let responder = async () => json({ code: 200, msg: 'ok', data: null })
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init })
  return responder(String(url), init)
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
function lastCall() {
  return calls[calls.length - 1]
}
function lastPath() {
  return new URL(lastCall().url, 'http://localhost').pathname
}
function lastMethod() {
  return lastCall().init?.method ?? 'GET'
}
function lastBody() {
  return lastCall().init?.body ? JSON.parse(lastCall().init.body) : null
}
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// ---- 组件运行时桩 ----
const messageCalls = { success: [], error: [], warning: [], info: [] }
globalThis.__contestAchievementMessage = {
  success: (text) => messageCalls.success.push(text),
  error: (text) => messageCalls.error.push(text),
  warning: (text) => messageCalls.warning.push(text),
  info: (text) => messageCalls.info.push(text),
}
const dialogCalls = []
globalThis.__contestAchievementDialog = {
  warning: (options) => {
    dialogCalls.push(options)
    return {}
  },
  success: (options) => {
    dialogCalls.push(options)
    return {}
  },
  error: (options) => {
    dialogCalls.push(options)
    return {}
  },
}
const routerCalls = []
globalThis.__contestAchievementRouter = {
  push: (to) => {
    routerCalls.push(to)
  },
}

const API_NAMES = [
  'searchUsers',
  'getUserAchievements',
  'addUserAchievement',
  'deleteUserAchievement',
]
let apiCalls = []
let apiImpls = {}
function resetApi() {
  apiCalls = []
  apiImpls = {
    searchUsers: async () => ({ list: [], total: 0 }),
    getUserAchievements: async () => ({ list: [], total: 0 }),
    addUserAchievement: async () => null,
    deleteUserAchievement: async () => null,
  }
  const api = {}
  for (const name of API_NAMES) {
    api[name] = (...args) => {
      apiCalls.push({ name, args })
      return apiImpls[name](...args)
    }
  }
  globalThis.__contestAchievementApi = api
}
function setApi(name, fn) {
  apiImpls[name] = fn
}
function callsFor(name) {
  return apiCalls.filter((call) => call.name === name)
}

const componentStubSources = {
  'vue-router': 'export const useRouter = () => globalThis.__contestAchievementRouter',
  'naive-ui': [
    'export const useMessage = () => globalThis.__contestAchievementMessage',
    'export const useDialog = () => globalThis.__contestAchievementDialog',
    'export const NButton = {}',
    'export const NText = {}',
    'export const NSpace = {}',
    'export const NTag = {}',
  ].join('\n'),
  '@/utils/api': [
    'export const searchUsers = (...a) => globalThis.__contestAchievementApi.searchUsers(...a)',
    'export const getUserAchievements = (...a) => globalThis.__contestAchievementApi.getUserAchievements(...a)',
    'export const addUserAchievement = (...a) => globalThis.__contestAchievementApi.addUserAchievement(...a)',
    'export const deleteUserAchievement = (...a) => globalThis.__contestAchievementApi.deleteUserAchievement(...a)',
  ].join('\n'),
}
const componentStubUrls = Object.fromEntries(
  Object.entries(componentStubSources).map(([key, src]) => [
    key,
    `data:text/javascript,${encodeURIComponent(src)}`,
  ]),
)
const vueEntryUrl = import.meta.resolve('vue')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith('data:')) {
      if (specifier === 'vue') return { url: vueEntryUrl, shortCircuit: true }
      if (componentStubUrls[specifier]) return { url: componentStubUrls[specifier], shortCircuit: true }
    }
    if (specifier.startsWith('@/')) {
      let target = path.join(srcRoot, specifier.slice(2))
      if (!path.extname(target)) {
        if (fs.existsSync(`${target}.ts`)) target = `${target}.ts`
        else if (fs.existsSync(path.join(target, 'index.ts'))) target = path.join(target, 'index.ts')
      }
      return nextResolve(pathToFileURL(target).href, context)
    }
    return nextResolve(specifier, context)
  },
})

let componentModulePromise = null
function loadComponentModule() {
  if (!componentModulePromise) {
    componentModulePromise = (async () => {
      const source = fs.readFileSync(componentFile, 'utf-8')
      const { descriptor, errors } = parse(source)
      if (errors.length) throw new Error(`Achievement.vue 解析失败: ${errors[0].message}`)
      const compiled = compileScript(descriptor, { id: 'contest-achievement' })
      const { code } = await transformWithEsbuild(compiled.content, 'contest-achievement.ts', {
        loader: 'ts',
      })
      return import(`data:text/javascript,${encodeURIComponent(code)}`)
    })()
  }
  return componentModulePromise
}
async function mountComponent() {
  resetApi()
  messageCalls.success.length = 0
  messageCalls.error.length = 0
  messageCalls.warning.length = 0
  messageCalls.info.length = 0
  dialogCalls.length = 0
  routerCalls.length = 0
  const mod = await loadComponentModule()
  return mod.default.setup({}, { expose() {} })
}
// 选好用户后返回绑定，便于后续用例直接操作
async function mountWithUser(uid, list = [], total = list.length) {
  const b = await mountComponent()
  setApi('getUserAchievements', async () => ({ list, total }))
  await b.selectUser({ uid, username: uid })
  return b
}

// ================= A. 真实 API 契约 =================

await checkAsync('A1 searchUsers 仍按 keyword/page/pageSize 查询 /api/user/users', async () => {
  calls.length = 0
  await searchUsers('alice', 2, 5)
  const url = new URL(lastCall().url, 'http://localhost')
  assert.equal(url.pathname, '/api/user/users')
  assert.equal(url.searchParams.get('keyword'), 'alice')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('pageSize'), '5')
})

await checkAsync('A2 getUserAchievements 编码 uid 并携带真实分页参数', async () => {
  calls.length = 0
  responder = async () => json({ code: 200, msg: 'ok', data: { list: [], total: 0 } })
  await getUserAchievements('a/b c', 3, 10)
  assert.equal(lastPath(), '/api/users/a%2Fb%20c/achievements')
  const url = new URL(lastCall().url, 'http://localhost')
  assert.equal(url.searchParams.get('page'), '3')
  assert.equal(url.searchParams.get('pageSize'), '10')
})

await checkAsync('A3 addUserAchievement POST 到 /api/admin/users/{uid}/achievements', async () => {
  calls.length = 0
  responder = async () => json({ code: 200, msg: 'ok', data: null })
  await addUserAchievement('u1', {
    title: '省一',
    content: '蓝桥杯',
    proofUrl: 'https://example.com/cert.png',
    achieveTime: 1700000000000,
  })
  assert.equal(lastMethod(), 'POST')
  assert.equal(lastPath(), '/api/admin/users/u1/achievements')
  assert.deepEqual(lastBody(), {
    title: '省一',
    content: '蓝桥杯',
    proofUrl: 'https://example.com/cert.png',
    achieveTime: 1700000000000,
  })
})

await checkAsync('A4 deleteUserAchievement DELETE 到带 achievementId 的地址', async () => {
  calls.length = 0
  responder = async () => json({ code: 200, msg: 'ok', data: null })
  await deleteUserAchievement('a/b', 7)
  assert.equal(lastMethod(), 'DELETE')
  assert.equal(lastPath(), '/api/admin/users/a%2Fb/achievements/7')
})

// ================= B. 组件行为 =================

await checkAsync('B1 空关键字不发起查询并提示', async () => {
  const b = await mountComponent()
  b.searchKeyword.value = '   '
  await b.handleUserSearch()
  assert.equal(callsFor('searchUsers').length, 0)
  assert.deepEqual(messageCalls.warning, ['请输入 UID 或姓名'])
  assert.equal(b.searched.value, false)
})

await checkAsync('B2 查询成功展示真实 list/total 且不自动选首人', async () => {
  const b = await mountComponent()
  setApi('searchUsers', async () => ({
    list: [
      { uid: 'u1', username: 'alice' },
      { uid: 'u2', username: 'bob' },
    ],
    total: 12,
  }))
  b.searchKeyword.value = 'alice'
  await b.handleUserSearch()
  assert.deepEqual(
    b.userResults.value.map((u) => u.uid),
    ['u1', 'u2'],
  )
  assert.equal(b.userTotal.value, 12)
  assert.equal(b.searched.value, true)
  assert.equal(b.selectedUser.value, null, '查询不得自动选中第一人')
})

await checkAsync('B3 查询失败进入错误态而非空数据态', async () => {
  const b = await mountComponent()
  setApi('searchUsers', async () => {
    throw new Error('用户查询失败：网络异常')
  })
  b.searchKeyword.value = 'alice'
  await b.handleUserSearch()
  assert.equal(b.searchError.value, '用户查询失败：网络异常')
  assert.equal(b.searched.value, false)
  assert.deepEqual(b.userResults.value, [])
  assert.equal(b.userTotal.value, 0)
})

await checkAsync('B4 查询成功但无匹配进入空状态', async () => {
  const b = await mountComponent()
  setApi('searchUsers', async () => ({ list: [], total: 0 }))
  b.searchKeyword.value = 'nobody'
  await b.handleUserSearch()
  assert.equal(b.searched.value, true)
  assert.equal(b.searchError.value, '')
  assert.deepEqual(b.userResults.value, [])
})

await checkAsync('B5 选择用户加载其真实成就（uid/page/pageSize）', async () => {
  const b = await mountComponent()
  setApi('getUserAchievements', async () => ({
    list: [{ id: 1, title: '一等奖', content: '蓝桥杯', proofUrl: null, achieveTime: null, status: 1 }],
    total: 1,
  }))
  await b.selectUser({ uid: 'u1', username: 'alice' })
  assert.equal(b.selectedUser.value.uid, 'u1')
  assert.deepEqual(callsFor('getUserAchievements')[0].args, ['u1', 1, 10])
  assert.deepEqual(
    b.achievements.value.map((row) => row.id),
    [1],
  )
  assert.equal(b.achieveTotal.value, 1)
})

await checkAsync('B6 切换用户后迟到的旧成就响应不覆盖当前用户', async () => {
  const b = await mountComponent()
  const first = deferred()
  const second = deferred()
  setApi('getUserAchievements', (uid) => (uid === 'A' ? first.promise : second.promise))
  const pendingA = b.selectUser({ uid: 'A', username: 'a' })
  const pendingB = b.selectUser({ uid: 'B', username: 'b' })
  second.resolve({ list: [{ id: 22, title: 'B' }], total: 1 })
  await pendingB
  first.resolve({ list: [{ id: 11, title: 'A' }], total: 1 })
  await pendingA
  assert.equal(b.selectedUser.value.uid, 'B')
  assert.deepEqual(
    b.achievements.value.map((row) => row.id),
    [22],
  )
})

await checkAsync('B7 迟到的旧用户查询响应不覆盖新查询结果', async () => {
  const b = await mountComponent()
  const first = deferred()
  const second = deferred()
  setApi('searchUsers', (keyword) => (keyword === 'old' ? first.promise : second.promise))
  b.searchKeyword.value = 'old'
  const pendingOld = b.handleUserSearch()
  b.searchKeyword.value = 'new'
  const pendingNew = b.handleUserSearch()
  second.resolve({ list: [{ uid: 'new1' }], total: 1 })
  await pendingNew
  first.resolve({ list: [{ uid: 'old1' }], total: 1 })
  await pendingOld
  assert.deepEqual(
    b.userResults.value.map((u) => u.uid),
    ['new1'],
  )
  assert.equal(b.userTotal.value, 1)
})

await checkAsync('B8 未选用户时禁止写入，不发请求', async () => {
  const b = await mountComponent()
  b.form.content = '尝试写入'
  await b.handleAddAchievement()
  assert.equal(callsFor('addUserAchievement').length, 0)
  assert.deepEqual(messageCalls.warning, ['请先选择用户'])
})

await checkAsync('B9 content 为空拒绝添加并保留表单', async () => {
  const b = await mountWithUser('A')
  b.form.title = '标题'
  b.form.content = '   '
  await b.handleAddAchievement()
  assert.equal(callsFor('addUserAchievement').length, 0)
  assert.ok(messageCalls.warning.includes('请填写成就内容'))
  assert.equal(b.form.title, '标题')
  assert.equal(b.form.content, '   ')
})

await checkAsync('B10 添加成功绑定选中 uid，提交清洗后的 payload 并刷新', async () => {
  const b = await mountWithUser('A', [{ id: 1, title: 't' }], 1)
  b.form.title = ' 冠军 '
  b.form.content = '  一等奖 '
  b.form.proofUrl = ' https://example.com/p.png '
  b.form.achieveTime = 1700000000000
  await b.handleAddAchievement()
  assert.deepEqual(callsFor('addUserAchievement')[0].args, [
    'A',
    {
      title: '冠军',
      content: '一等奖',
      proofUrl: 'https://example.com/p.png',
      achieveTime: 1700000000000,
    },
  ])
  assert.deepEqual(callsFor('getUserAchievements').at(-1).args, ['A', 1, 10])
  assert.equal(b.form.title, '')
  assert.equal(b.form.content, '')
  assert.equal(b.form.proofUrl, '')
  assert.equal(b.form.achieveTime, null)
  assert.ok(messageCalls.success.includes('成就添加成功'))
})

await checkAsync('B11 添加失败保留表单且不刷新', async () => {
  const b = await mountWithUser('A')
  const before = callsFor('getUserAchievements').length
  setApi('addUserAchievement', async () => {
    throw new Error('添加成就失败')
  })
  b.form.content = '保留我'
  await b.handleAddAchievement()
  assert.equal(b.form.content, '保留我')
  assert.equal(callsFor('getUserAchievements').length, before)
  assert.ok(messageCalls.error.includes('添加成就失败'))
})

await checkAsync('B12 提交中重复点击不重复发请求', async () => {
  const b = await mountWithUser('A')
  const pending = deferred()
  setApi('addUserAchievement', () => pending.promise)
  b.form.content = '只发一次'
  const first = b.handleAddAchievement()
  const second = b.handleAddAchievement()
  pending.resolve(null)
  await first
  await second
  assert.equal(callsFor('addUserAchievement').length, 1)
})

await checkAsync('B13 非 http/https 证明链接拒绝提交', async () => {
  const b = await mountWithUser('A')
  b.form.content = '危险链接'
  b.form.proofUrl = 'javascript:alert(1)'
  await b.handleAddAchievement()
  assert.equal(callsFor('addUserAchievement').length, 0)
  assert.ok(messageCalls.warning.some((text) => text.includes('http/https')))
})

await checkAsync('B14 添加期间切换用户不把刷新写到新用户', async () => {
  const b = await mountComponent()
  setApi('getUserAchievements', async (uid) => ({
    list: uid === 'B' ? [{ id: 2, title: 'B' }] : [],
    total: 1,
  }))
  await b.selectUser({ uid: 'A', username: 'a' })
  const pending = deferred()
  setApi('addUserAchievement', () => pending.promise)
  b.form.content = 'A 的成就'
  const pendingAdd = b.handleAddAchievement()
  await b.selectUser({ uid: 'B', username: 'b' })
  const before = callsFor('getUserAchievements').length
  pending.resolve(null)
  await pendingAdd
  assert.equal(callsFor('getUserAchievements').length, before, '不得为旧用户追加刷新')
  assert.deepEqual(
    b.achievements.value.map((row) => row.id),
    [2],
  )
})

await checkAsync('B15 删除弹出确认，确认时绑定点击用户与 achievementId', async () => {
  const b = await mountWithUser('A')
  setApi('deleteUserAchievement', async () => null)
  b.handleDeleteAchievement({ id: 5, title: '待删' })
  assert.equal(dialogCalls.length, 1, '删除必须经确认弹窗')
  assert.equal(typeof dialogCalls[0].onPositiveClick, 'function')
  await dialogCalls[0].onPositiveClick()
  assert.deepEqual(callsFor('deleteUserAchievement')[0].args, ['A', 5])
})

await checkAsync('B16 确认前切换用户仍删除原用户成就（目标绑定）', async () => {
  const b = await mountComponent()
  setApi('getUserAchievements', async () => ({ list: [], total: 0 }))
  await b.selectUser({ uid: 'A', username: 'a' })
  b.handleDeleteAchievement({ id: 10, title: 'A 的成就' })
  const options = dialogCalls.at(-1)
  await b.selectUser({ uid: 'B', username: 'b' })
  const before = callsFor('getUserAchievements').length
  setApi('deleteUserAchievement', async () => null)
  await options.onPositiveClick()
  assert.deepEqual(callsFor('deleteUserAchievement')[0].args, ['A', 10])
  assert.equal(callsFor('getUserAchievements').length, before, '不得用已切换的 B 重载')
})

await checkAsync('B17 删除成功重载当前页，页末最后一条回退上一页', async () => {
  const b = await mountComponent()
  setApi('getUserAchievements', async (_uid, page) => ({
    list: page === 2 ? [{ id: 21 }, { id: 22 }] : [{ id: 11 }],
    total: 30,
  }))
  await b.selectUser({ uid: 'A', username: 'a' })
  await b.handleAchievePageChange(2)
  setApi('deleteUserAchievement', async () => null)
  b.handleDeleteAchievement({ id: 21, title: 'x' })
  await dialogCalls.at(-1).onPositiveClick()
  assert.deepEqual(callsFor('getUserAchievements').at(-1).args, ['A', 2, 10])

  const b2 = await mountComponent()
  setApi('getUserAchievements', async (_uid, page) => ({
    list: page === 2 ? [{ id: 21 }] : [{ id: 11 }],
    total: 11,
  }))
  await b2.selectUser({ uid: 'B', username: 'b' })
  await b2.handleAchievePageChange(2)
  b2.handleDeleteAchievement({ id: 21, title: 'x' })
  await dialogCalls.at(-1).onPositiveClick()
  assert.deepEqual(callsFor('getUserAchievements').at(-1).args, ['B', 1, 10])
})

await checkAsync('B18 删除失败保留现有记录', async () => {
  const records = [{ id: 1, title: '保留' }]
  const b = await mountWithUser('A', records, 1)
  setApi('deleteUserAchievement', async () => {
    throw new Error('删除成就失败')
  })
  b.handleDeleteAchievement(records[0])
  await dialogCalls.at(-1).onPositiveClick()
  assert.deepEqual(
    b.achievements.value.map((row) => row.id),
    [1],
  )
  assert.ok(messageCalls.error.includes('删除成就失败'))
})

await checkAsync('B19 未选用户时删除被拒且不弹窗', async () => {
  const b = await mountComponent()
  b.handleDeleteAchievement({ id: 1, title: 'x' })
  assert.equal(dialogCalls.length, 0)
  assert.deepEqual(messageCalls.warning, ['请先选择用户'])
})

await checkAsync('B20 成就为空进入空状态而非错误', async () => {
  const b = await mountWithUser('A', [], 0)
  assert.equal(b.achieveLoaded.value, true)
  assert.equal(b.achieveError.value, '')
  assert.deepEqual(b.achievements.value, [])
  assert.equal(b.achieveTotal.value, 0)
})

await checkAsync('B21 成就加载失败显示错误而非空状态', async () => {
  const b = await mountComponent()
  setApi('getUserAchievements', async () => {
    throw new Error('成就记录加载失败')
  })
  await b.selectUser({ uid: 'A', username: 'a' })
  assert.equal(b.achieveError.value, '成就记录加载失败')
  assert.equal(b.achieveLoaded.value, false)
})

await checkAsync('B22 保留前往成就申请审核入口', async () => {
  const b = await mountComponent()
  b.goUserAchievement()
  assert.deepEqual(routerCalls, [{ name: 'AdminUserAchievement' }])
})

// ================= C. 源码约束 =================

check('C1 复用真实 API，无 mock / 随机 / 延时', () => {
  const source = fs.readFileSync(componentFile, 'utf-8')
  for (const name of API_NAMES) {
    assert.ok(source.includes(name), `必须复用 ${name}`)
  }
  assert.ok(!source.includes('Math.random'), '不得包含随机模拟数据')
  assert.ok(!source.includes('setTimeout'), '不得包含模拟延时')
  assert.ok(!source.includes('模拟数据'), '不得包含模拟数据')
})

check('C2 proofUrl 仅 http/https、外链带 noopener/noreferrer', () => {
  const source = fs.readFileSync(componentFile, 'utf-8')
  assert.ok(source.includes('/^https?:\\/\\//i'), '需有 http(s) 校验')
  assert.ok(source.includes("rel: 'noopener noreferrer'"), '外链必须 noopener/noreferrer')
  assert.ok(source.includes("target: '_blank'"), '外链需新窗口打开')
})

check('C3 未选用户时禁用写入，且无凭据细节泄漏', () => {
  const source = fs.readFileSync(componentFile, 'utf-8')
  assert.ok(source.includes(':disabled="!selectedUser"'), '未选用户时必须禁用写入控件')
  assert.ok(source.includes('AdminUserAchievement'), '必须保留成就申请审核入口')
  assert.ok(!source.includes('Bearer'), '页面不得出现凭据细节')
})

check('C4 提交中禁用表单，避免成功时丢弃用户新输入', () => {
  const source = fs.readFileSync(componentFile, 'utf-8')
  assert.ok(
    source.includes(':disabled="!selectedUser || submitting"'),
    '提交中的表单必须禁用写入控件',
  )
})

await checkAsync('D1 关键词变化同步作废旧查询并清空分页/错误/loading，保留已选用户', async () => {
  const b = await mountComponent()
  setApi('searchUsers', async () => ({ list: [{ uid: 'u1', username: 'alice' }], total: 1 }))
  b.searchKeyword.value = 'alice'
  await b.handleUserSearch()
  await b.selectUser({ uid: 'u1', username: 'alice' })

  const pending = deferred()
  setApi('searchUsers', () => pending.promise)
  b.searchKeyword.value = 'alice2'
  const request = b.handleUserSearch()
  b.searchKeyword.value = 'bob'
  assert.equal(b.searching.value, false, '关键词变化需立即清空 loading')
  assert.equal(b.searched.value, false)
  assert.equal(b.searchError.value, '')
  assert.deepEqual(b.userResults.value, [])
  assert.equal(b.userTotal.value, 0)
  assert.equal(b.userPage.value, 1)
  assert.equal(b.selectedUser.value?.uid, 'u1', '关键词变化不得重置已选用户')

  pending.resolve({ list: [{ uid: 'old' }], total: 1 })
  await request
  assert.deepEqual(b.userResults.value, [], '迟到的旧响应不得回填到新搜索词下')
  assert.equal(b.searched.value, false)
})

await checkAsync('D2 提交进行中 submitting 为真、结束后复位', async () => {
  const b = await mountWithUser('A')
  const pending = deferred()
  setApi('addUserAchievement', () => pending.promise)
  b.form.content = '进行中'
  const request = b.handleAddAchievement()
  assert.equal(b.submitting.value, true, '提交期间须为真以禁用表单')
  pending.resolve(null)
  await request
  assert.equal(b.submitting.value, false)
})

await checkAsync('D3 关键词变化但未再次查询时，旧响应不得写入新搜索词下', async () => {
  const b = await mountComponent()
  const pending = deferred()
  setApi('searchUsers', () => pending.promise)
  b.searchKeyword.value = 'alice'
  const request = b.handleUserSearch()
  b.searchKeyword.value = 'bob'
  await new Promise((resolve) => setTimeout(resolve, 0))
  pending.resolve({ list: [{ uid: 'alice' }], total: 1 })
  await request
  assert.equal(b.searched.value, false)
  assert.deepEqual(b.userResults.value, [])
})

console.log(`\n${passed} contest achievement checks passed`)
