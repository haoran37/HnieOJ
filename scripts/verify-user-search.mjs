// 用户查询回归：真实 searchUsers 参数契约 + 编译真实 UserSearchBox.vue 验证组件行为。
// 覆盖：三参数兼容、筛选传 ID 且空值不发送、级联清空与竞态、空条件拦截、
// 真实 list/total 与分页、失败显式报错、仅点击用户才导航。
// 运行：node scripts/verify-user-search.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import { searchUsers } from '../src/utils/api.ts'

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

// ---- 真实 fetch / localStorage 桩：直接验证 searchUsers 的参数契约 ----
const calls = []
const storage = new Map()
let responder = async () => json({ code: 200, msg: 'ok', data: { list: [], total: 0 } })
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init })
  return responder(url, init)
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
function lastUrl() {
  return calls[calls.length - 1].url
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

// ---- 组件运行时桩：编译真实 UserSearchBox.vue 后替换其运行时依赖 ----
const routerCalls = []
globalThis.__userSearchRouter = {
  push: (to) => {
    routerCalls.push(to)
  },
}
const messageCalls = { warning: [], error: [] }
globalThis.__userSearchMessage = {
  warning: (text) => messageCalls.warning.push(text),
  error: (text) => messageCalls.error.push(text),
}
globalThis.__userSearchApiStub = {
  getColleges: async () => [],
  getGrades: async () => [],
  getClasses: async () => [],
  searchUsers: async () => ({ list: [], total: 0 }),
}
const componentStubSources = {
  'vue-router': 'export const useRouter = () => globalThis.__userSearchRouter',
  'naive-ui': 'export const useMessage = () => globalThis.__userSearchMessage',
  '@vicons/ionicons5': 'export const SearchOutline = {}',
  '@/components/BoardCard.vue': 'export default {}',
  '@/utils/api': [
    'export const getColleges = (...a) => globalThis.__userSearchApiStub.getColleges(...a)',
    'export const getGrades = (...a) => globalThis.__userSearchApiStub.getGrades(...a)',
    'export const getClasses = (...a) => globalThis.__userSearchApiStub.getClasses(...a)',
    'export const searchUsers = (...a) => globalThis.__userSearchApiStub.searchUsers(...a)',
  ].join('\n'),
}
const componentStubUrls = Object.fromEntries(
  Object.entries(componentStubSources).map(([key, src]) => [
    key,
    `data:text/javascript,${encodeURIComponent(src)}`,
  ]),
)
// 注册 hook 之前解析真实 vue 入口，避免 resolve hook 递归
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
      const source = fs.readFileSync(
        path.join(srcRoot, 'views/oj/HomePage/components/UserSearchBox.vue'),
        'utf-8',
      )
      const { descriptor, errors } = parse(source)
      if (errors.length) throw new Error(`UserSearchBox.vue 解析失败: ${errors[0].message}`)
      const compiled = compileScript(descriptor, { id: 'user-search-box' })
      const { code } = await transformWithEsbuild(compiled.content, 'user-search-box.ts', {
        loader: 'ts',
      })
      return import(`data:text/javascript,${encodeURIComponent(code)}`)
    })()
  }
  return componentModulePromise
}
// 每次 setup 都返回全新的绑定，避免用例之间互相污染
async function mountComponent() {
  const mod = await loadComponentModule()
  return mod.default.setup({}, { expose() {} })
}

// ================= A. searchUsers 参数契约 =================

await checkAsync('A1 三参数调用保持兼容：只带 keyword/page/pageSize', async () => {
  calls.length = 0
  await searchUsers('alice', 2, 5)
  const url = lastUrl()
  assert.ok(url.includes('keyword=alice'), url)
  assert.ok(url.includes('page=2'), url)
  assert.ok(url.includes('pageSize=5'), url)
  assert.ok(!url.includes('collegeId='), url)
  assert.ok(!url.includes('grade='), url)
  assert.ok(!url.includes('classId='), url)
})

await checkAsync('A2 带班级筛选时请求包含完整 collegeId/grade/classId', async () => {
  calls.length = 0
  await searchUsers('', 1, 5, { collegeId: 2, grade: '2022', classId: 7 })
  const url = lastUrl()
  assert.ok(url.includes('collegeId=2'), url)
  assert.ok(url.includes('grade=2022'), url)
  assert.ok(url.includes('classId=7'), url)
  assert.ok(!url.includes('keyword='), url)
})

await checkAsync('A3 空值筛选不发送对应参数', async () => {
  calls.length = 0
  await searchUsers('bob', 1, 5, { collegeId: null, grade: '', classId: undefined })
  const url = lastUrl()
  assert.ok(url.includes('keyword=bob'), url)
  assert.ok(!url.includes('collegeId='), url)
  assert.ok(!url.includes('grade='), url)
  assert.ok(!url.includes('classId='), url)
})

await checkAsync('A4 班级缺少学院/年级前置时不发送无效 classId', async () => {
  calls.length = 0
  await searchUsers('', 1, 5, { classId: 9 })
  const url = lastUrl()
  assert.ok(!url.includes('classId='), url)
})

// ================= B. UserSearchBox 组件行为 =================

await checkAsync('B1 全空条件不发起请求，提示请输入条件', async () => {
  const b = await mountComponent()
  messageCalls.warning.length = 0
  let searchCalled = 0
  globalThis.__userSearchApiStub.searchUsers = async () => {
    searchCalled += 1
    return { list: [], total: 0 }
  }
  await b.handleSearch()
  assert.equal(searchCalled, 0, '全空条件不得发起全库查询')
  assert.deepEqual(messageCalls.warning, ['请输入条件'])
  assert.equal(b.searched.value, false)
})

await checkAsync('B2 keyword 查询展示真实 list/total，且查询本身不导航', async () => {
  const b = await mountComponent()
  routerCalls.length = 0
  globalThis.__userSearchApiStub.searchUsers = async () => ({
    list: [
      { uid: 'u1', username: 'alice' },
      { uid: 'u2', username: 'bob' },
    ],
    total: 12,
  })
  b.keyword.value = 'alice'
  await b.handleSearch()
  assert.equal(b.total.value, 12)
  assert.deepEqual(
    b.users.value.map((u) => u.uid),
    ['u1', 'u2'],
  )
  assert.equal(b.searched.value, true)
  assert.deepEqual(routerCalls, [], '查询本身不得自动跳转第一人')
})

await checkAsync('B3 只用学院筛选可查询，请求携带学院 ID', async () => {
  const b = await mountComponent()
  let captured = null
  globalThis.__userSearchApiStub.searchUsers = async (keyword, page, pageSize, filters) => {
    captured = { keyword, page, pageSize, filters }
    return { list: [], total: 0 }
  }
  b.collegeId.value = 2
  await b.handleSearch()
  assert.ok(captured, '应发起查询')
  assert.equal(captured.keyword, '')
  assert.deepEqual(captured.filters, { collegeId: 2, grade: null, classId: null })
})

await checkAsync('B4 班级筛选请求携带完整 collegeId/grade/classId', async () => {
  const b = await mountComponent()
  let captured = null
  globalThis.__userSearchApiStub.searchUsers = async (keyword, page, pageSize, filters) => {
    captured = { keyword, page, pageSize, filters }
    return { list: [], total: 0 }
  }
  b.collegeId.value = 2
  b.grade.value = '2022'
  b.classId.value = 7
  await b.handleSearch()
  assert.deepEqual(captured.filters, { collegeId: 2, grade: '2022', classId: 7 })
})

await checkAsync('B5 选择学院清空年级/班级，选择年级清空班级', async () => {
  const b = await mountComponent()
  globalThis.__userSearchApiStub.getGrades = async () => [{ id: 1, grade: '2022' }]
  b.grade.value = '2022'
  b.classId.value = 7
  const pending = b.handleCollegeChange(1)
  assert.equal(b.grade.value, null, '选择学院应清空年级')
  assert.equal(b.classId.value, null, '选择学院应清空班级')
  assert.deepEqual(b.gradeOptions.value, [])
  await pending
  assert.deepEqual(b.gradeOptions.value, [{ label: '2022', value: '2022' }])

  b.collegeId.value = 1
  b.classId.value = 9
  globalThis.__userSearchApiStub.getClasses = async () => [{ id: 9, name: '计科1班' }]
  const pendingClass = b.handleGradeChange('2022')
  assert.equal(b.classId.value, null, '选择年级应清空班级')
  await pendingClass
  assert.deepEqual(b.classOptions.value, [{ label: '计科1班', value: 9 }])
})

await checkAsync('B6 学院迟到的年级响应不覆盖新选择', async () => {
  const b = await mountComponent()
  const first = deferred()
  const second = deferred()
  globalThis.__userSearchApiStub.getGrades = (college) =>
    college === 1 ? first.promise : second.promise
  const pendingA = b.handleCollegeChange(1)
  const pendingB = b.handleCollegeChange(2)
  second.resolve([{ id: 2, grade: '2022' }])
  await pendingB
  first.resolve([{ id: 1, grade: '2021' }]) // 迟到的旧响应必须被丢弃
  await pendingA
  assert.deepEqual(b.gradeOptions.value, [{ label: '2022', value: '2022' }])
  assert.equal(b.loadingGrades.value, false)
})

await checkAsync('B7 切换年级迟到的班级响应不覆盖新选择', async () => {
  const b = await mountComponent()
  b.collegeId.value = 1
  const first = deferred()
  const second = deferred()
  globalThis.__userSearchApiStub.getClasses = (_college, grade) =>
    grade === '2021' ? first.promise : second.promise
  const pendingA = b.handleGradeChange('2021')
  const pendingB = b.handleGradeChange('2022')
  second.resolve([{ id: 2, name: '新班级' }])
  await pendingB
  first.resolve([{ id: 1, name: '旧班级' }])
  await pendingA
  assert.deepEqual(b.classOptions.value, [{ label: '新班级', value: 2 }])
  assert.equal(b.loadingClasses.value, false)
})

await checkAsync('B8 翻页在途旧响应不覆盖新页', async () => {
  const b = await mountComponent()
  b.keyword.value = 'alice'
  const first = deferred()
  const second = deferred()
  const seenPages = []
  globalThis.__userSearchApiStub.searchUsers = (_keyword, page) => {
    seenPages.push(page)
    return page === 1 ? first.promise : second.promise
  }
  const pendingP1 = b.handlePageChange(1)
  const pendingP2 = b.handlePageChange(2)
  second.resolve({ list: [{ uid: 'p2' }], total: 12 })
  await pendingP2
  first.resolve({ list: [{ uid: 'p1' }], total: 12 })
  await pendingP1
  assert.deepEqual(seenPages, [1, 2])
  assert.equal(b.page.value, 2)
  assert.deepEqual(
    b.users.value.map((u) => u.uid),
    ['p2'],
  )
})

await checkAsync('B9 分页使用真实 total 与固定 pageSize', async () => {
  const b = await mountComponent()
  let captured = null
  globalThis.__userSearchApiStub.searchUsers = async (keyword, page, pageSize) => {
    captured = { keyword, page, pageSize }
    return { list: [{ uid: 'u1' }], total: 12 }
  }
  b.keyword.value = 'alice'
  await b.handleSearch()
  assert.equal(captured.page, 1)
  assert.equal(captured.pageSize, 5)
  assert.equal(b.total.value, 12)
})

await checkAsync('B10 查询失败显示错误而不伪装无数据', async () => {
  const b = await mountComponent()
  globalThis.__userSearchApiStub.searchUsers = async () => {
    throw new Error('用户查询失败：网络异常')
  }
  b.keyword.value = 'alice'
  await b.handleSearch()
  assert.equal(b.errorMessage.value, '用户查询失败：网络异常')
  assert.equal(b.searched.value, false, '失败不得进入空数据状态')
  assert.deepEqual(b.users.value, [])
  assert.equal(b.total.value, 0)
})

await checkAsync('B11 仅点击用户才导航，重复点击同一用户不重复跳转', async () => {
  const b = await mountComponent()
  routerCalls.length = 0
  await b.goToUser('u2')
  assert.deepEqual(routerCalls, ['/user/u2'])
  await b.goToUser('u2')
  assert.deepEqual(routerCalls, ['/user/u2'], '重复选择同一用户不应重复导航')
  await b.goToUser('u3')
  assert.deepEqual(routerCalls, ['/user/u2', '/user/u3'])
})

await checkAsync('B12 级联加载失败显示可理解错误并复位 loading', async () => {
  const b = await mountComponent()
  messageCalls.error.length = 0
  globalThis.__userSearchApiStub.getGrades = async () => {
    throw new Error('年级接口不可用')
  }
  await b.handleCollegeChange(3)
  assert.deepEqual(messageCalls.error, ['年级接口不可用'])
  assert.equal(b.loadingGrades.value, false)
})

await checkAsync('B13 改条件后在途查询响应不再回填', async () => {
  const b = await mountComponent()
  const pendingSearch = deferred()
  globalThis.__userSearchApiStub.searchUsers = () => pendingSearch.promise
  globalThis.__userSearchApiStub.getGrades = async () => []
  b.keyword.value = 'alice'
  const pending = b.handleSearch()
  assert.equal(b.searching.value, true)
  await b.handleCollegeChange(2) // 查询在途时改条件
  pendingSearch.resolve({ list: [{ uid: 'stale' }], total: 3 })
  await pending
  assert.equal(b.searched.value, false, '切换条件后旧查询响应不得回填')
  assert.deepEqual(b.users.value, [])
})

await checkAsync('B14 无匹配时进入空状态而非伪装失败', async () => {
  const b = await mountComponent()
  globalThis.__userSearchApiStub.searchUsers = async () => ({ list: [], total: 0 })
  b.keyword.value = 'nobody'
  await b.handleSearch()
  assert.equal(b.searched.value, true, '查询成功但无匹配应进入空状态')
  assert.equal(b.errorMessage.value, '')
  assert.deepEqual(b.users.value, [])
  assert.equal(b.total.value, 0)
})

check('C1 组件不再宣称班级筛选不受支持，改为加载真实年级/班级选项', () => {
  const source = fs.readFileSync(
    path.join(srcRoot, 'views/oj/HomePage/components/UserSearchBox.vue'),
    'utf-8',
  )
  assert.ok(!source.includes('暂不支持按班级筛选'), '班级筛选不应再是禁用占位')
  assert.ok(source.includes('getGrades') && source.includes('getClasses'), '应加载真实年级/班级选项')
  assert.ok(source.includes('未找到匹配用户'), '应有无匹配空状态文案')
})

await checkAsync('B15 keyword 变更后作废在途查询响应', async () => {
  const b = await mountComponent()
  const pendingSearch = deferred()
  globalThis.__userSearchApiStub.searchUsers = () => pendingSearch.promise
  b.keyword.value = 'alice'
  const pending = b.handleSearch()
  b.keyword.value = 'bob' // 在途时改关键字
  pendingSearch.resolve({ list: [{ uid: 'alice' }], total: 1 })
  await pending
  assert.equal(b.searched.value, false, 'keyword 变更后旧响应不得回填')
  assert.deepEqual(b.users.value, [])
})

await checkAsync('B16 classId 变更/清空后作废在途查询响应', async () => {
  const b = await mountComponent()
  const pendingSearch = deferred()
  globalThis.__userSearchApiStub.searchUsers = () => pendingSearch.promise
  b.collegeId.value = 2
  b.grade.value = '2022'
  b.classId.value = 7
  const pending = b.handleSearch()
  b.classId.value = null // 在途时清空班级
  pendingSearch.resolve({ list: [{ uid: 'stale' }], total: 1 })
  await pending
  assert.equal(b.searched.value, false, 'classId 变更后旧响应不得回填')
  assert.deepEqual(b.users.value, [])
})

await checkAsync('B17 条件清空后翻页不触发全库查询', async () => {
  const b = await mountComponent()
  let searchCalled = 0
  globalThis.__userSearchApiStub.searchUsers = async () => {
    searchCalled += 1
    return { list: [{ uid: 'u1' }], total: 12 }
  }
  b.keyword.value = 'alice'
  await b.handleSearch()
  assert.equal(searchCalled, 1)
  b.keyword.value = '' // 清空唯一条件
  messageCalls.warning.length = 0
  await b.handlePageChange(2)
  assert.equal(searchCalled, 1, '条件清空后翻页不得再发请求')
  assert.deepEqual(messageCalls.warning, ['请输入条件'])
})

await checkAsync('B18 用户 UID 特殊字符按路径段编码', async () => {
  const b = await mountComponent()
  routerCalls.length = 0
  await b.goToUser('a/b c')
  assert.deepEqual(routerCalls, ['/user/a%2Fb%20c'])
})

check('C2 结果项使用原生可聚焦控件且 goToUser 编码 uid', () => {
  const source = fs.readFileSync(
    path.join(srcRoot, 'views/oj/HomePage/components/UserSearchBox.vue'),
    'utf-8',
  )
  assert.ok(source.includes('<button'), '结果项应为 button 等原生可聚焦控件')
  assert.ok(source.includes('class="user-item"'), '按钮应保留 user-item 样式类')
  assert.ok(source.includes('encodeURIComponent(uid)'), 'goToUser 应编码 uid 路径段')
})

console.log(`\n${passed} user search checks passed`)
