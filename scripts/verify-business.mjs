// 业务接线最小回归：真实请求参数/路径 + 纯映射函数。
// 运行：node scripts/verify-business.mjs（仓库根目录，Node 22.18+ / 24 原生 TS 类型剥离 + registerHooks）
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from 'vue/compiler-sfc'

const root = fileURLToPath(new URL('..', import.meta.url))

// 与其余 verify 脚本一致：原生 TS + node:module registerHooks 解析 '@/' 别名
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      let target = path.join(root, 'src', specifier.slice(2))
      if (!path.extname(target)) target += '.ts'
      return next(pathToFileURL(target).href, context)
    }
    return next(specifier, context)
  },
})

const {
  getProblemList,
  getProblemDetail,
  checkProblem,
  submitCode,
  submitCodeFile,
  getSubmissions,
  getSubmissionCases,
  getSubmissionDetail,
  downloadProblemTestCase,
  downloadProblemTestdata,
  getRelatedDiscussions,
  getAdminProblemList,
  getAdminProblemDetail,
  createAdminProblem,
  updateAdminProblem,
  deleteAdminProblem,
  updateAdminProblemAuth,
  uploadAdminProblemTestdata,
  uploadAdminProblemImage,
  deleteAdminProblemImage,
  getAdminDiscussions,
  updateAdminDiscussion,
  deleteAdminDiscussion,
  getAdminAnnouncements,
  createAdminAnnouncement,
  updateAdminAnnouncement,
  deleteAdminAnnouncement,
  updateAdminAnnouncementStatus,
  getJudgeOutbox,
  retryJudgeOutbox,
} = await import(pathToFileURL(path.join(root, 'src/utils/api.ts')).href)
const { toProblemRow, difficultyLabel } = await import(
  pathToFileURL(path.join(root, 'src/types/problem.ts')).href
)
const { submissionStatusText, isJudgingStatus, SUBMISSION_STATUS } = await import(
  pathToFileURL(path.join(root, 'src/types/submission.ts')).href
)

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

const storage = new Map([['token', 'real-token']])
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
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
function lastCall() {
  return calls[calls.length - 1]
}
function lastQuery() {
  const url = new URL(lastCall().url, 'http://localhost')
  return Object.fromEntries(url.searchParams.entries())
}
function lastParams() {
  return new URL(lastCall().url, 'http://localhost').searchParams
}

await checkAsync('题目列表：page/pageSize/keyword/difficulty 与数组 tags 正确编码', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { list: [], total: 0 } })
  await getProblemList(2, 30, { keyword: ' a b ', tags: ['数学', '数论'], difficulty: 0 })
  const query = lastQuery()
  assert.equal(lastCall().url.split('?')[0], '/api/problems')
  assert.equal(query.page, '2')
  assert.equal(query.pageSize, '30')
  assert.equal(query.keyword, 'a b')
  assert.equal(query.difficulty, '0')
  assert.deepEqual(lastParams().getAll('tags'), ['数学', '数论'])
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token')
})

await checkAsync('题目列表：空关键字/tags/难度不发送空参数', async () => {
  await getProblemList(1, 30, { keyword: '  ', tags: [], difficulty: null })
  const query = lastQuery()
  assert.ok(!('keyword' in query), '空 keyword 不应发送')
  assert.ok(!('tags' in query), '空 tags 不应发送')
  assert.ok(!('difficulty' in query), 'null difficulty 不应发送')
})

await checkAsync('题目详情：problemCode 作为路径段（不是内部 id）', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { id: 1, problemCode: 'P1000' } })
  await getProblemDetail('P1000')
  assert.equal(lastCall().url, '/api/problems/P1000')
})

await checkAsync('题目查验：使用内部数字 problemId 查询', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { exists: true, problemId: 7, problemCode: 'P1006' } })
  const result = await checkProblem(7)
  assert.equal(lastCall().url, '/api/problems/check?problemId=7')
  assert.equal(result.problemCode, 'P1006')
})

await checkAsync('提交：JSON 携带 contestId，字段仅 problemCode/language/code/contestId', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { submissionId: 'abc123' } })
  const result = await submitCode({ problemCode: 'P1000', language: 'cpp', code: 'int main(){}', contestId: '12' })
  assert.equal(lastCall().url, '/api/submissions')
  assert.equal(lastCall().init.method, 'POST')
  assert.deepEqual(JSON.parse(lastCall().init.body), {
    problemCode: 'P1000',
    language: 'cpp',
    code: 'int main(){}',
    contestId: '12',
  })
  assert.equal(result.submissionId, 'abc123')
})

await checkAsync('提交：multipart 文件同时携带 contestId', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { submissionId: 'file1' } })
  const form = new FormData()
  form.append('problemCode', 'P1000')
  form.append('language', 'cpp')
  form.append('contestId', '12')
  form.append('file', new Blob(['int main(){}']), 'main.cpp')
  await submitCodeFile(form)
  assert.equal(lastCall().url, '/api/submissions')
  const body = lastCall().init.body
  assert.ok(body instanceof FormData, 'multipart 请求应为 FormData')
  assert.equal(body.get('problemCode'), 'P1000')
  assert.equal(body.get('contestId'), '12')
  assert.ok(body.get('file'), '应包含 file')
})

await checkAsync('提交列表：status 为数字、contestId/uid 映射', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { list: [], total: 0 } })
  await getSubmissions({ page: 1, pageSize: 20, problemCode: 'P1000', status: 3, contestId: '5', uid: '20230001' })
  const query = lastQuery()
  assert.equal(query.status, '3')
  assert.equal(query.contestId, '5')
  assert.equal(query.uid, '20230001')
  assert.equal(query.problemCode, 'P1000')
})

await checkAsync('提交详情与测试点：使用 submissionId 路径', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { submissionId: 's1', status: 0 } })
  await getSubmissionDetail('s1')
  assert.equal(lastCall().url, '/api/submissions/s1')
  responder = async () => json({ code: 200, msg: 'success', data: [] })
  await getSubmissionCases('s1')
  assert.equal(lastCall().url, '/api/submissions/s1/cases')
})

await checkAsync('测试数据下载：使用内部 problem.id 且鉴权 Blob', async () => {
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
  responder = async () => new Response(zip, { status: 200, headers: { 'Content-Type': 'application/zip' } })
  const all = await downloadProblemTestdata(7)
  assert.equal(lastCall().url, '/api/problems/7/testdata/download')
  assert.equal(lastCall().init.headers.get('Authorization'), 'Bearer real-token')
  assert.ok(all.size > 0)
  const one = await downloadProblemTestCase(7, 3)
  assert.equal(lastCall().url, '/api/problems/7/testdata/3/download')
  assert.ok(one.size > 0)
})

await checkAsync('测试数据下载：后端 JSON 业务错误必须抛错，不能当文件保存', async () => {
  responder = async () => json({ code: 403, msg: '缺少角色权限', data: null })
  await assert.rejects(
    () => downloadProblemTestCase(7, 1),
    (error) => error.name === 'ApiError' && error.code === 403,
  )
})

await checkAsync('相关讨论：problemCode + limit 查询', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: [{ id: 1, title: 't' }] })
  const list = await getRelatedDiscussions('P1000', 5)
  const query = lastQuery()
  assert.equal(lastCall().url.split('?')[0], '/api/discussions/related')
  assert.equal(query.problemCode, 'P1000')
  assert.equal(query.limit, '5')
  assert.deepEqual(list, [{ id: 1, title: 't' }])
})

// ---------------- 本批：题目 / 讨论 / 公告 / outbox 管理端接线 ----------------

await checkAsync('管理题目列表：page/pageSize/keyword/auth 编码且第二页 total>pageSize 原样返回', async () => {
  responder = async () => json({
    code: 200,
    msg: 'success',
    data: { list: [{ id: 11, problemCode: 'P1011' }], total: 25 },
  })
  const page = await getAdminProblemList({ page: 2, pageSize: 10, keyword: ' P1 ', auth: 3 })
  const query = lastQuery()
  assert.equal(lastCall().url.split('?')[0], '/api/admin/problem/list')
  assert.equal(query.page, '2')
  assert.equal(query.pageSize, '10')
  assert.equal(query.keyword, 'P1')
  assert.equal(query.auth, '3')
  assert.equal(page.total, 25)
  assert.ok(page.total > page.list.length, 'total 应大于当页条数，供 remote 分页使用')
})

await checkAsync('管理题目详情：GET /api/admin/problem/{id} 返回完整 DTO（含 SPJ/交互字段）', async () => {
  responder = async () => json({
    code: 200,
    msg: 'success',
    data: {
      problem: {
        id: 7,
        problemCode: 'P1006',
        title: '交互题',
        judgeMode: 'interactive',
        interactorCode: 'int main(){}',
        isRemoveEndBlank: true,
        spjOutputLimit: 16777216,
      },
      tags: ['数学'],
    },
  })
  const detail = await getAdminProblemDetail(7)
  assert.equal(lastCall().url, '/api/admin/problem/7')
  assert.equal(detail.problem.interactorCode, 'int main(){}')
  assert.equal(detail.problem.isRemoveEndBlank, true)
  assert.deepEqual(detail.tags, ['数学'])
})

await checkAsync('管理题目新增/编辑：{problem,tags} 载荷与 PUT 路径', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: null })
  const payload = {
    problem: { problemCode: 'P1001', title: 't', auth: 1, examples: [{ input: '1', output: '1' }] },
    tags: ['数学'],
  }
  await createAdminProblem(payload)
  assert.equal(lastCall().url, '/api/admin/problem')
  assert.equal(lastCall().init.method, 'POST')
  assert.deepEqual(JSON.parse(lastCall().init.body), payload)

  await updateAdminProblem({ problem: { id: 7, problemCode: 'P1001', title: 't', auth: 3 }, tags: [] })
  assert.equal(lastCall().url, '/api/admin/problem')
  assert.equal(lastCall().init.method, 'PUT')
})

await checkAsync('管理题目删除/可见范围：DELETE body{pid}、PUT /auth body{pid,auth}', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: null })
  await deleteAdminProblem(7)
  assert.equal(lastCall().url, '/api/admin/problem')
  assert.equal(lastCall().init.method, 'DELETE')
  assert.deepEqual(JSON.parse(lastCall().init.body), { pid: 7 })

  await updateAdminProblemAuth(7, 2)
  assert.equal(lastCall().url, '/api/admin/problem/auth')
  assert.equal(lastCall().init.method, 'PUT')
  assert.deepEqual(JSON.parse(lastCall().init.body), { pid: 7, auth: 2 })
})

await checkAsync('测试数据上传：multipart file 且不手动设置 Content-Type', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: null })
  const file = new File(['PK'], 'testdata.zip', { type: 'application/zip' })
  await uploadAdminProblemTestdata(7, file)
  assert.equal(lastCall().url, '/api/admin/problem/7/testdata')
  assert.equal(lastCall().init.method, 'POST')
  const body = lastCall().init.body
  assert.ok(body instanceof FormData, '测试数据上传应为 FormData')
  assert.equal(body.get('file').name, 'testdata.zip')
  assert.equal(lastCall().init.headers.get('Content-Type'), null, 'FormData 不应手动设置 Content-Type')
})

await checkAsync('题面图片上传/删除：真实 URL 与 filename 编码', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: '/oj/images/7/ABC.png' })
  const url = await uploadAdminProblemImage(7, new File(['x'], 'a.png', { type: 'image/png' }))
  assert.equal(lastCall().url, '/api/admin/problem/7/images')
  assert.ok(lastCall().init.body instanceof FormData)
  assert.equal(url, '/oj/images/7/ABC.png')

  responder = async () => json({ code: 200, msg: 'success', data: null })
  await deleteAdminProblemImage(7, 'ABC 1.png')
  assert.equal(lastCall().url, '/api/admin/problem/7/images/ABC%201.png')
  assert.equal(lastCall().init.method, 'DELETE')
})

await checkAsync('管理讨论：列表筛选、PUT 载荷按 DTO、DELETE 路径', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { list: [], total: 0 } })
  await getAdminDiscussions({ page: 1, pageSize: 10, keyword: 'C++', category: 'Problem', status: 0 })
  const query = lastQuery()
  assert.equal(lastCall().url.split('?')[0], '/api/admin/discussions')
  assert.equal(query.category, 'Problem')
  assert.equal(query.status, '0')

  responder = async () => json({ code: 200, msg: 'success', data: null })
  await updateAdminDiscussion(5, {
    title: 't',
    category: 'Problem',
    problemCode: 'P1001',
    content: 'c',
    status: 1,
    isTop: true,
  })
  assert.equal(lastCall().url, '/api/admin/discussions/5')
  assert.equal(lastCall().init.method, 'PUT')
  assert.deepEqual(JSON.parse(lastCall().init.body), {
    title: 't',
    category: 'Problem',
    problemCode: 'P1001',
    content: 'c',
    status: 1,
    isTop: true,
  })

  await deleteAdminDiscussion(5)
  assert.equal(lastCall().url, '/api/admin/discussions/5')
  assert.equal(lastCall().init.method, 'DELETE')
})

await checkAsync('公告：CRUD 带 category，状态接口 {status}', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { list: [], total: 0 } })
  await getAdminAnnouncements({ page: 1, pageSize: 10, keyword: '维护', status: 1, category: 'ANNOUNCEMENT' })
  const query = lastQuery()
  assert.equal(lastCall().url.split('?')[0], '/api/admin/announcements')
  assert.equal(query.status, '1')
  assert.equal(query.category, 'ANNOUNCEMENT')

  responder = async () => json({ code: 200, msg: 'success', data: null })
  await createAdminAnnouncement({ title: 't', content: 'c', status: 1, category: 'ANNOUNCEMENT' })
  assert.equal(lastCall().url, '/api/admin/announcements')
  assert.equal(lastCall().init.method, 'POST')
  assert.deepEqual(JSON.parse(lastCall().init.body), {
    title: 't',
    content: 'c',
    status: 1,
    category: 'ANNOUNCEMENT',
  })

  await updateAdminAnnouncement(3, { title: 't2', content: 'c2', status: 0, category: 'NEWS' })
  assert.equal(lastCall().url, '/api/admin/announcements/3')
  assert.equal(lastCall().init.method, 'PUT')
  assert.equal(JSON.parse(lastCall().init.body).category, 'NEWS')

  await updateAdminAnnouncementStatus(3, 1)
  assert.equal(lastCall().url, '/api/admin/announcements/3/status')
  assert.deepEqual(JSON.parse(lastCall().init.body), { status: 1 })

  await deleteAdminAnnouncement(3)
  assert.equal(lastCall().url, '/api/admin/announcements/3')
  assert.equal(lastCall().init.method, 'DELETE')
})

await checkAsync('outbox：列表筛选小写状态、重试路径', async () => {
  responder = async () => json({ code: 200, msg: 'success', data: { list: [], total: 0 } })
  await getJudgeOutbox({ page: 2, pageSize: 20, status: 'failed', submissionId: ' s1 ', judgeTaskId: ' j1 ' })
  const query = lastQuery()
  assert.equal(lastCall().url.split('?')[0], '/api/admin/submissions/judge-outbox')
  assert.equal(query.status, 'failed')
  assert.equal(query.submissionId, 's1')
  assert.equal(query.judgeTaskId, 'j1')
  assert.equal(query.page, '2')

  responder = async () => json({ code: 200, msg: 'success', data: null })
  await retryJudgeOutbox(29)
  assert.equal(lastCall().url, '/api/admin/submissions/judge-outbox/29/retry')
  assert.equal(lastCall().init.method, 'POST')
})

await checkAsync('错误不假成功：outbox 重试已发送记录后端 400 必须抛 ApiError', async () => {
  responder = async () => json({ code: 400, msg: '已发送的 outbox 不能重试', data: null }, 400)
  await assert.rejects(
    () => retryJudgeOutbox(29),
    (error) => error.name === 'ApiError' && (error.status === 400 || error.code === 400),
  )
})

// 用 vue/compiler-sfc 把 SFC 编译成模板 AST，只查 n-data-table 元素节点上的 remote 属性：
// 裸 remote 或 :remote="true" 才算；文件别处的 remote、remote-data、data-remote、:data="remoteList" 都不算。
// compiler-sfc 入口未导出 NodeTypes 枚举，6=ATTRIBUTE、7=DIRECTIVE 为 compiler-core 的稳定节点类型值。
const isRemoteProp = (prop) =>
  (prop.type === 6 && prop.name === 'remote') ||
  (prop.type === 7 &&
    prop.name === 'bind' &&
    prop.arg?.content === 'remote' &&
    prop.exp?.content?.trim() === 'true')

function hasRemoteDataTable(source) {
  const { descriptor, errors } = parse(source)
  assert.equal(errors.length, 0, 'SFC 应能编译出模板 AST')
  let found = false
  const visit = (node) => {
    if (node.tag === 'n-data-table' && node.props.some(isRemoteProp)) found = true
    for (const child of node.children ?? []) visit(child)
    for (const branch of node.branches ?? []) visit(branch)
  }
  if (descriptor.template) visit(descriptor.template.ast)
  return found
}

// 上面的检查针对 SFC 文件；下面正反例是模板片段，套一层 <template> 后走同一条 AST 路径
const templateFragment = (content) => `<template>\n${content}\n</template>`

check('服务端分页表格必须设置 remote（否则 Naive UI 忽略 total）', () => {
  const files = [
    '../src/views/admin/ProblemManage/ProblemList/index.vue',
    '../src/views/admin/DiscussManage/DiscussList.vue',
    '../src/views/admin/ContentManage/ContentManagePage.vue',
    '../src/views/admin/SystemManage/Status.vue',
  ]
  for (const file of files) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.match(source, /<n-data-table\b/, `${file} 应包含 n-data-table`)
    assert.ok(hasRemoteDataTable(source), `${file} 的 n-data-table 起始标签应使用 remote`)
  }
})

check('remote 断言范围：只认 n-data-table 起始标签上的 remote 属性', () => {
  const remote = (content) => hasRemoteDataTable(templateFragment(content))
  assert.equal(remote('<n-data-table remote :columns="columns" />'), true)
  assert.equal(remote('<n-data-table\n  :remote="true"\n  :columns="columns"\n/>'), true)
  assert.equal(
    remote('<div class="remote">remote</div>\n<n-data-table :columns="columns" />'),
    false,
  )
  assert.equal(remote('<n-data-table remote-data :columns="columns" />'), false)
  assert.equal(remote('<n-data-table data-remote :columns="columns" />'), false)
  assert.equal(remote('<n-data-table :data="remoteList" :columns="columns" />'), false)
  assert.equal(remote('<n-data-table :remote="false" :columns="columns" />'), false)
})

check('本批文件无 mock 数据/模拟延时/占位上传地址', () => {
  const files = [
    '../src/composables/admin/useProblemManage.ts',
    '../src/composables/admin/useProblemForm.ts',
    '../src/composables/admin/useDiscussManage.ts',
    '../src/composables/admin/useAnnouncement.ts',
    '../src/composables/admin/useTagManage.ts',
    '../src/views/admin/ProblemManage/ProblemList/index.vue',
    '../src/views/admin/ProblemManage/ProblemList/components/ProblemAdd.vue',
    '../src/views/admin/ProblemManage/ProblemList/components/ProblemEdit.vue',
    '../src/views/admin/ProblemManage/Tag.vue',
    '../src/views/admin/DiscussManage/DiscussList.vue',
    '../src/views/admin/ContentManage/ContentManagePage.vue',
    '../src/views/admin/SystemManage/Status.vue',
  ]
  for (const file of files) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.ok(!/mocky\.io/.test(source), `${file} 不应包含占位上传地址`)
    assert.ok(!/Math\.random/.test(source), `${file} 不应包含随机业务数据`)
    assert.ok(!/setTimeout/.test(source), `${file} 不应包含模拟延时`)
  }
})

check('题目列表 VO → 表格行：通过率由 accepted/submission 计算，难度可读', () => {
  const row = toProblemRow({
    id: 6,
    problemCode: 'P1005',
    title: '素数判断',
    difficulty: 1,
    tags: ['数学', '数论'],
    submissionCount: 40,
    acceptedCount: 30,
    scorePercentage: 0,
  })
  assert.equal(row.id, 6)
  assert.equal(row.problemCode, 'P1005')
  assert.equal(row.passRate, 75)
  assert.equal(row.tags.length, 2)
  assert.equal(difficultyLabel(0), '简单')
  assert.equal(difficultyLabel(2), '困难')
  assert.equal(difficultyLabel(null), '未评级')
  const zero = toProblemRow({
    id: 1, problemCode: 'P1', title: 't', difficulty: null, tags: null,
    submissionCount: 0, acceptedCount: 0, scorePercentage: null,
  })
  assert.equal(zero.passRate, 0)
  assert.deepEqual(zero.tags, [])
})

check('提交状态：整数码映射与判题中判定', () => {
  assert.equal(submissionStatusText(0), 'Accepted')
  assert.equal(submissionStatusText(3), 'Wrong Answer')
  assert.equal(submissionStatusText(2), 'Compile Error')
  assert.equal(submissionStatusText(-10), 'Pending')
  assert.equal(submissionStatusText(99), 'Unknown')
  assert.equal(submissionStatusText(0, 'Accepted（后端文案）'), 'Accepted（后端文案）')
  assert.equal(isJudgingStatus(SUBMISSION_STATUS.PENDING), true)
  assert.equal(isJudgingStatus(SUBMISSION_STATUS.COMPILING), true)
  assert.equal(isJudgingStatus(SUBMISSION_STATUS.RUNNING), true)
  assert.equal(isJudgingStatus(SUBMISSION_STATUS.ACCEPTED), false)
  assert.equal(isJudgingStatus(SUBMISSION_STATUS.WRONG_ANSWER), false)
  assert.equal(isJudgingStatus(null), false)
})

console.log(`\n${passed} checks passed`)
