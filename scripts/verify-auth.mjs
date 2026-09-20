// 最小认证/请求回归验证：不依赖测试框架，直接用 Node 内置能力。
// 运行：node scripts/verify-auth.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse, compileScript } from 'vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import { ApiError, download, get, getClasses, login, post } from '../src/utils/api.ts'
import { hasAnyRole, normalizeRoles, primaryRole } from '../src/types/user.ts'

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

// 让 Node 能解析 src 内的 @/ 别名，从而动态导入真实 store（无新依赖、无打包器）
const srcRoot = fileURLToPath(new URL('../src/', import.meta.url))

// 组件行为验证：编译真实 register.vue 后，把它的运行时依赖替换为桩模块。
// 仅测试使用，不进入产物；用现有 vite/esbuild 能力，不新增依赖或生产抽象。
globalThis.__registerApiStub = {
  getColleges: async () => [],
  getGrades: async () => [],
  getClasses: async () => [],
  register: async () => null,
}
globalThis.__registerMessage = { error() {}, success() {}, warning() {} }
globalThis.__registerRouter = { push() {} }
const componentStubSources = {
  'vue-router': 'export const useRouter = () => globalThis.__registerRouter',
  'naive-ui': 'export const useMessage = () => globalThis.__registerMessage',
  '@/utils/api': [
    'export const getColleges = (...a) => globalThis.__registerApiStub.getColleges(...a)',
    'export const getGrades = (...a) => globalThis.__registerApiStub.getGrades(...a)',
    'export const getClasses = (...a) => globalThis.__registerApiStub.getClasses(...a)',
    'export const register = (...a) => globalThis.__registerApiStub.register(...a)',
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

let registerComponentPromise = null
async function loadRegisterComponent() {
  if (!registerComponentPromise) {
    registerComponentPromise = (async () => {
      const source = fs.readFileSync(path.join(srcRoot, 'views/auth/register.vue'), 'utf-8')
      const { descriptor, errors } = parse(source)
      if (errors.length) throw new Error(`register.vue 解析失败: ${errors[0].message}`)
      const compiled = compileScript(descriptor, { id: 'register' })
      const { code } = await transformWithEsbuild(compiled.content, 'register.ts', { loader: 'ts' })
      const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`)
      return mod.default.setup({}, { expose() {} })
    })()
  }
  return registerComponentPromise
}

let storeModulePromise = null
function loadUserStoreModule() {
  if (!storeModulePromise) {
    storeModulePromise = Promise.all([
      import('pinia'),
      import('../src/stores/userStore.ts'),
    ]).then(([pinia, store]) => ({ ...pinia, ...store }))
  }
  return storeModulePromise
}
async function freshStore() {
  const { createPinia, setActivePinia, useUserStore } = await loadUserStoreModule()
  setActivePinia(createPinia())
  return useUserStore()
}

// ---- fetch / localStorage 桩 ----
const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}

const calls = []
let responder = async () => json({ code: 200, msg: 'ok', data: null })

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
function lastCall() {
  return calls[calls.length - 1]
}
function setToken(value) {
  if (value) storage.set('token', value)
  else storage.delete('token')
}

await checkAsync('GET query 保留 0/false 并正确编码，跳过 null/undefined', async () => {
  setToken(null)
  responder = async () => json({ code: 200, msg: 'ok', data: { ok: true } })
  await get('/api/demo', { page: 0, flag: false, keyword: 'a b&c', skip: null, miss: undefined })
  const { url } = lastCall()
  assert.ok(url.includes('page=0'), `expected page=0 in ${url}`)
  assert.ok(url.includes('flag=false'), `expected flag=false in ${url}`)
  assert.ok(url.includes('keyword=a+b%26c'), `expected encoded keyword in ${url}`)
  assert.ok(!url.includes('skip='), 'null 参数不应出现')
  assert.ok(!url.includes('miss='), 'undefined 参数不应出现')
})

await checkAsync('Bearer 真实 token 与 JSON 请求体', async () => {
  setToken('real-token')
  responder = async () =>
    json({ code: 200, msg: 'ok', data: { token: 't', userInfo: { uid: 'u', username: 'n', roles: ['student'] } } })
  await post('/api/auth/login', { uid: '20230001', password: 'secret' })
  const { init } = lastCall()
  assert.equal(init.headers.get('Authorization'), 'Bearer real-token')
  assert.equal(init.headers.get('Content-Type'), 'application/json')
  assert.equal(init.body, JSON.stringify({ uid: '20230001', password: 'secret' }))
})

await checkAsync('无 token 时不携带 Authorization', async () => {
  setToken(null)
  responder = async () => json({ code: 200, msg: 'ok', data: null })
  await get('/api/colleges')
  assert.equal(lastCall().init.headers.get('Authorization'), null)
})

await checkAsync('FormData 不设置 Content-Type 且原样发送', async () => {
  setToken('real-token')
  const form = new FormData()
  form.append('file', 'content')
  responder = async () => json({ code: 200, msg: 'ok', data: null })
  await post('/api/upload', form)
  const { init } = lastCall()
  assert.equal(init.headers.get('Content-Type'), null)
  assert.ok(init.body instanceof FormData)
})

await checkAsync('成功且 data 为空时返回 null，不伪造数据', async () => {
  responder = async () => json({ code: 200, msg: '注册申请提交成功，请等待审核', data: null })
  const data = await post('/api/auth/register', {})
  assert.equal(data, null)
})

await checkAsync('业务 code 非 200 抛 ApiError 且带业务码', async () => {
  responder = async () => json({ code: 1003, msg: '密码错误', data: null })
  await assert.rejects(
    () => post('/api/auth/login', {}),
    (error) =>
      error instanceof ApiError &&
      error.code === 1003 &&
      error.status === 200 &&
      error.message === '密码错误' &&
      error.isUnauthorized === false,
  )
})

await checkAsync('HTTP 401 抛 ApiError 且标记为认证失效', async () => {
  responder = async () => json({ code: 401, msg: '未登录或登录已过期', data: null }, 401)
  await assert.rejects(
    () => get('/api/user/profile'),
    (error) => error instanceof ApiError && error.status === 401 && error.isUnauthorized === true,
  )
})

await checkAsync('HTTP 403 不标记为认证失效（不应清理登录）', async () => {
  responder = async () => json({ code: 403, msg: '缺少角色权限', data: null }, 403)
  await assert.rejects(
    () => get('/api/user/profile'),
    (error) => error instanceof ApiError && error.status === 403 && error.isUnauthorized === false,
  )
})

await checkAsync('网络异常抛 ApiError 而不是返回假数据', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  try {
    await assert.rejects(
      () => get('/api/user/profile'),
      (error) => error instanceof ApiError && error.message === 'Failed to fetch',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

await checkAsync('非统一 Response 格式不返回假数据', async () => {
  responder = async () => new Response('not-json', { status: 200 })
  await assert.rejects(() => get('/api/demo'), (error) => error instanceof ApiError)
})

await checkAsync('blob 下载返回 Blob 且携带 token', async () => {
  setToken('real-token')
  responder = async () => new Response(new Blob(['abc']), { status: 200 })
  const blob = await download('/api/users/import/template')
  assert.ok(blob instanceof Blob)
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token')
})

await checkAsync('登录接口路径与请求体符合后端契约', async () => {
  setToken(null)
  responder = async () =>
    json({ code: 200, msg: '登录成功', data: { token: 't', userInfo: { uid: '20230001', username: 'admin', roles: ['root', 'student'] } } })
  const data = await login('20230001', 'secret')
  assert.equal(lastCall().url, '/api/auth/login')
  assert.deepEqual(JSON.parse(lastCall().init.body), { uid: '20230001', password: 'secret' })
  assert.equal(data.token, 't')
})

await checkAsync('班级接口路径正确拼接', async () => {
  setToken('real-token')
  responder = async () => json({ code: 200, msg: 'success', data: [{ id: 7, name: '计科2班' }] })
  const list = await getClasses(1, '2022')
  assert.equal(lastCall().url, '/api/colleges/1/grades/2022/classes')
  assert.deepEqual(list, [{ id: 7, name: '计科2班' }])
})

// ---- R1：下载响应必须按 Content-Type/Result 判定，不能把错误 JSON 当文件保存 ----
await checkAsync('R1 下载：HTTP200 业务 code=401 抛认证失效，不保存为成功', async () => {
  responder = async () => json({ code: 401, msg: '未登录或登录已过期', data: null })
  await assert.rejects(
    () => download('/api/users/import/template'),
    (error) =>
      error instanceof ApiError && error.code === 401 && error.status === 200 && error.isUnauthorized === true,
  )
})

await checkAsync('R1 下载：HTTP200 业务 code=404 抛错，不保存为成功', async () => {
  responder = async () => json({ code: 404, msg: '文件不存在', data: null })
  await assert.rejects(
    () => download('/api/users/import/template'),
    (error) =>
      error instanceof ApiError && error.code === 404 && error.status === 200 && error.message === '文件不存在',
  )
})

await checkAsync('R1 下载：有效 zip 返回 Blob', async () => {
  const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
  responder = async () =>
    new Response(zipBytes, { status: 200, headers: { 'Content-Type': 'application/zip' } })
  const blob = await download('/api/users/import/template')
  assert.ok(blob instanceof Blob)
  assert.ok(blob.size > 0, 'zip blob 不应为空')
})

// ---- R2：请求层 401 必须同步清理 store/storage；403 与网络错误不得清理 ----
await checkAsync('R2 业务请求 401 清理已登录 store 与 storage', async () => {
  setToken('real-token')
  const store = await freshStore()
  responder = async () =>
    json({ code: 200, msg: 'ok', data: { uid: 'u1', username: 'n1', roles: ['admin'] } })
  await store.restoreSession()
  assert.equal(store.isLogin, true)
  assert.equal(store.isAdmin, true)

  // 服务端 token 失效后的任意业务请求
  responder = async () => json({ code: 401, msg: '登录已过期', data: null }, 401)
  await assert.rejects(
    () => get('/api/problems'),
    (error) => error instanceof ApiError && error.isUnauthorized === true,
  )

  assert.equal(store.token, null)
  assert.equal(store.isLogin, false)
  assert.equal(store.isAdmin, false)
  assert.equal(store.userInfo.id, '')
  assert.equal(storage.has('token'), false)
})

await checkAsync('R2 下载 401 同样清理已登录 store', async () => {
  setToken('real-token')
  const store = await freshStore()
  responder = async () =>
    json({ code: 200, msg: 'ok', data: { uid: 'u4', username: 'n4', roles: ['admin'] } })
  await store.restoreSession()
  assert.equal(store.isAdmin, true)

  responder = async () => json({ code: 401, msg: '登录已过期', data: null })
  await assert.rejects(
    () => download('/api/users/import/template'),
    (error) => error instanceof ApiError && error.isUnauthorized === true,
  )
  assert.equal(store.isLogin, false)
  assert.equal(store.isAdmin, false)
  assert.equal(storage.has('token'), false)
})

await checkAsync('R2 403 与网络错误不清理有效登录', async () => {
  setToken('real-token')
  const store = await freshStore()
  responder = async () =>
    json({ code: 200, msg: 'ok', data: { uid: 'u2', username: 'n2', roles: ['admin'] } })
  await store.restoreSession()
  assert.equal(store.isAdmin, true)

  responder = async () => json({ code: 403, msg: '缺少角色权限', data: null }, 403)
  await assert.rejects(() => get('/api/user/profile'), (error) => error.status === 403)
  assert.equal(store.isLogin, true)
  assert.equal(store.isAdmin, true)
  assert.equal(storage.get('token'), 'real-token')

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  try {
    await assert.rejects(() => get('/api/user/profile'), (error) => error instanceof ApiError)
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.equal(store.isLogin, true)
  assert.equal(store.isAdmin, true)
})

// ---- R3：网络失败可重试；logout 后迟到响应不得回填 ----
await checkAsync('R3 网络失败不标记 sessionReady，网络恢复后可重试成功', async () => {
  setToken('real-token')
  const store = await freshStore()
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  await store.restoreSession()
  assert.equal(store.sessionReady, false)
  assert.ok(store.sessionError, '网络失败应暴露可重试错误')
  assert.equal(store.isLogin, true, '网络失败不应清理有效 token')

  globalThis.fetch = originalFetch
  responder = async () =>
    json({ code: 200, msg: 'ok', data: { uid: 'u3', username: 'n3', roles: ['student'] } })
  await store.restoreSession()
  assert.equal(store.sessionReady, true)
  assert.equal(store.sessionError, null)
  assert.equal(store.userInfo.id, 'u3')
  assert.equal(store.isStudent, true)
})

await checkAsync('R3 logout 后迟到的 profile 响应不回填用户/角色', async () => {
  setToken('real-token')
  const store = await freshStore()
  let resolveProfile
  const pending = new Promise((resolve) => {
    resolveProfile = resolve
  })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => pending

  const profilePromise = store.loadProfile()
  // profile 请求在途时退出登录
  store.logout()
  resolveProfile(
    json({ code: 200, msg: 'ok', data: { uid: 'late', username: 'late', roles: ['admin'] } }),
  )
  await profilePromise
  globalThis.fetch = originalFetch

  assert.equal(store.isLogin, false)
  assert.equal(store.userInfo.id, '')
  assert.equal(store.isAdmin, false)
})

// ---- R4：注册学院/年级/班级联动竞态保护（编译真实 register.vue 验证组件行为） ----
check('R4 已删除通用 latest-request guard，由组件局部序号实现', () => {
  assert.equal(fs.existsSync(path.join(srcRoot, 'types/latest-request.ts')), false)
  const source = fs.readFileSync(path.join(srcRoot, 'views/auth/register.vue'), 'utf-8')
  assert.ok(!source.includes('createLatestRequestGuard'), 'register.vue 不应再引用通用 guard')
  assert.ok(source.includes('gradesRequestSeq'), '应由局部序号实现竞态保护')
})

await checkAsync('R4 学院/年级竞态：旧响应不覆盖新选择（真实组件行为）', async () => {
  const bindings = await loadRegisterComponent()
  const api = globalThis.__registerApiStub
  let resolveA
  let resolveB
  api.getGrades = (college) =>
    new Promise((resolve) => {
      if (college === 1) resolveA = resolve
      else resolveB = resolve
    })

  const pendingA = bindings.handleCollegeChange(1)
  const pendingB = bindings.handleCollegeChange(2)
  resolveB([{ id: 2, grade: '2022' }])
  await pendingB
  resolveA([{ id: 1, grade: '2021' }]) // A 最后返回，必须被丢弃
  await pendingA

  assert.deepEqual(bindings.grades.value, [{ id: 2, grade: '2022' }])
  assert.equal(bindings.loadingGrades.value, false)
})

await checkAsync('R4 切换学院作废在途班级请求并复位 loading（真实组件行为）', async () => {
  const bindings = await loadRegisterComponent()
  const api = globalThis.__registerApiStub
  api.getGrades = async () => [{ id: 9, grade: '2023' }]
  await bindings.handleCollegeChange(5)
  bindings.form.collegeId = 5

  let resolveClass
  api.getClasses = () =>
    new Promise((resolve) => {
      resolveClass = resolve
    })
  const pendingClass = bindings.handleGradeChange('2023')
  assert.equal(bindings.loadingClasses.value, true)

  await bindings.handleCollegeChange(6)
  assert.equal(bindings.loadingClasses.value, false, '切换学院后旧班级请求应将 loading 复位')

  resolveClass([{ id: 1, name: '过期班级' }]) // 旧学院响应迟到，必须被丢弃
  await pendingClass
  assert.deepEqual(bindings.classes.value, [])
  assert.equal(bindings.loadingClasses.value, false)
})

await checkAsync('R4 清空学院选择复位年级 loading（真实组件行为）', async () => {
  const bindings = await loadRegisterComponent()
  const api = globalThis.__registerApiStub
  let resolveGrades
  api.getGrades = () =>
    new Promise((resolve) => {
      resolveGrades = resolve
    })
  const pending = bindings.handleCollegeChange(3)
  assert.equal(bindings.loadingGrades.value, true)

  await bindings.handleCollegeChange(null)
  assert.equal(bindings.loadingGrades.value, false, '清空选择后应复位 loading')

  resolveGrades([{ id: 3, grade: '2020' }])
  await pending
  assert.deepEqual(bindings.grades.value, [])
  assert.equal(bindings.loadingGrades.value, false)
})

check('角色规范化：小写转大写、去重、忽略未知', () => {
  assert.deepEqual(normalizeRoles(['root', 'student']), ['ROOT', 'STUDENT'])
  assert.deepEqual(normalizeRoles(['ADMIN', 'admin']), ['ADMIN'])
  assert.deepEqual(normalizeRoles(['unknown']), [])
  assert.deepEqual(normalizeRoles(null), [])
  assert.deepEqual(normalizeRoles(undefined), [])
})

check('主角色取权限最高者', () => {
  assert.equal(primaryRole([]), 'GUEST')
  assert.equal(primaryRole(['STUDENT', 'ADMIN']), 'ADMIN')
  assert.equal(primaryRole(['TEACHER', 'TA', 'STUDENT']), 'TEACHER')
  assert.equal(primaryRole(['ROOT', 'STUDENT']), 'ROOT')
})

check('多角色权限计算正确', () => {
  const teacherStudent = normalizeRoles(['student', 'teacher'])
  assert.equal(hasAnyRole(teacherStudent, ['TEACHER', 'ADMIN', 'ROOT']), true)
  assert.equal(hasAnyRole(teacherStudent, ['ADMIN', 'ROOT']), false)
  assert.equal(hasAnyRole(teacherStudent, ['STUDENT']), true)

  const rootStudent = normalizeRoles(['root', 'student'])
  assert.equal(hasAnyRole(rootStudent, ['ADMIN', 'ROOT']), true)
  assert.equal(primaryRole(rootStudent), 'ROOT')

  assert.equal(hasAnyRole([], ['STUDENT', 'TA', 'TEACHER', 'ADMIN', 'ROOT']), false)
})

console.log(`\n${passed} checks passed`)
