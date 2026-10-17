// P0 单测：存储骨架 / 护栏（语义 b 保守子集）/ 会话外改动留痕 / 装配视图数据面 / HTTP 数据面
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildAssemblyView,
  classifySectionName,
  collectStatus,
  containsPath,
  detectExternalChanges,
  ensureStorage,
  guardDecision,
  hashOfFile,
  makeApi,
  readAssembly,
  resolveHome,
  snapshot,
  squash,
  storageRoot,
} from '../src/index.ts'

let pass = 0
let fail = 0
function check(label, cond, detail) {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const ROOT = 'D:/ai本地模型/dsh/dsh-custom'

console.log('A. 路径与会话外定位')
check('resolveHome 尊重 DSH_HOME', resolveHome({ DSH_HOME: 'X:/h' }) === 'X:/h')
check('resolveHome 空 DSH_HOME 回退默认', resolveHome({ DSH_HOME: '' }).endsWith('.dsh'))
check('storageRoot 拼 dsh-custom 子目录', storageRoot({ DSH_HOME: 'X:/h' }) === join('X:/h', 'dsh-custom'))
check('squash 归一混合分隔符与大小写', squash('D:\\AI\\x/ y') === 'd:/ai/x/ y')

console.log('B. 路径包含判定（防误伤近邻目录）')
check('反斜杠子路径命中', containsPath('D:\\ai本地模型\\dsh\\dsh-custom\\discipline.md', ROOT))
check('正斜杠子路径命中', containsPath('d:/ai本地模型/dsh/dsh-custom/override.md', ROOT))
check('大小写不敏感命中', containsPath('D:/AI本地模型/DSH/DSH-CUSTOM', ROOT))
check('存储根目录本身命中', containsPath(ROOT, ROOT))
check('近邻 dsh-custom-prompt 不命中', !containsPath('D:/DeepSeek/dsh-plugin-dev/docs/dsh-custom-prompt-research.md', ROOT))
check('近邻 dsh-custom2 不命中', !containsPath('D:/x/dsh-custom2/a.md', ROOT))
check('无关路径不命中', !containsPath('D:/other/file.md', ROOT))

console.log('C. 护栏判定：写工具')
check(
  'write 写存储 → deny',
  guardDecision('write', { file_path: 'D:\\ai本地模型\\dsh\\dsh-custom\\discipline.md', content: 'x' }, ROOT).action === 'deny',
)
check(
  'write 写别处 → allow 且不触碰',
  guardDecision('write', { file_path: 'D:/other/file.md' }, ROOT).action === 'allow' &&
    !guardDecision('write', { file_path: 'D:/other/file.md' }, ROOT).touches,
)
check(
  'edit 写近邻目录 → allow（边界防误伤）',
  guardDecision('edit', { file_path: 'D:/DeepSeek/dsh-plugin-dev/docs/dsh-custom-prompt-research-20261017.md' }, ROOT).action === 'allow',
)
check('deny 附原因文本', String(guardDecision('write', { file_path: ROOT + '/x.md' }, ROOT).reason ?? '').length > 0)

console.log('D. 护栏判定：shell')
check(
  'Set-Content 写存储 → deny',
  guardDecision('shell', { command: `Set-Content -Path 'D:\\ai本地模型\\dsh\\dsh-custom\\discipline.md' -Value 'x'` }, ROOT).action === 'deny',
)
check(
  'Remove-Item 删存储 → deny',
  guardDecision('shell', { command: `Remove-Item 'D:\\ai本地模型\\dsh\\dsh-custom\\override.md'` }, ROOT).action === 'deny',
)
check(
  'JSON 双反斜杠转义形态 → deny',
  guardDecision('shell', { command: `Set-Content 'D:\\\\ai本地模型\\\\dsh\\\\dsh-custom\\\\x.md' 'v'` }, ROOT).action === 'deny',
)
check(
  'Get-Content 读存储 → allow 但留痕触碰',
  (() => {
    const d = guardDecision('shell', { command: `Get-Content 'D:\\ai本地模型\\dsh\\dsh-custom\\discipline.md'` }, ROOT)
    return d.action === 'allow' && d.touches
  })(),
)
check(
  '扩展名 .md 不误判为写动词',
  guardDecision('shell', { command: `Get-Content 'D:\\ai本地模型\\dsh\\dsh-custom\\discipline-md.md'` }, ROOT).action === 'allow',
)
check(
  'shell 无关命令 → allow 且不触碰',
  (() => {
    const d = guardDecision('shell', { command: 'Get-ChildItem D:/other' }, ROOT)
    return d.action === 'allow' && !d.touches
  })(),
)
check('read 工具读存储 → allow（非写）', guardDecision('read', { file_path: ROOT + '/meta.json' }, ROOT).action === 'allow')

console.log('E. 存储骨架（临时目录实战）')
const tmp = mkdtempSync(join(tmpdir(), 'dsh-custom-test-'))
try {
  const info = ensureStorage(tmp)
  check('ensureStorage 建目录与四文件', info.created.length >= 5 && existsSync(join(tmp, 'discipline.md')) && existsSync(join(tmp, 'scope.json')))
  check('重复 ensureStorage 不再新建', ensureStorage(tmp).created.length === 0)

  check('首次 establish 后无外部改动告警', detectExternalChanges(tmp).length === 0)
  writeFileSync(join(tmp, 'discipline.md'), '外部手工改动', 'utf8')
  const changes = detectExternalChanges(tmp)
  check('会话外修改被检出（留痕）', changes.length === 1 && changes[0].file === 'discipline.md' && changes[0].to === hashOfFile(join(tmp, 'discipline.md')))
  const auditLines = readFileSync(join(tmp, 'audit.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  check('audit.jsonl 含 external-change 记录', auditLines.some((e) => e.kind === 'external-change'))

  const snapDir = snapshot(tmp, 'test')
  check('快照目录含被跟踪文件', existsSync(join(snapDir, 'discipline.md')) && existsSync(join(snapDir, 'override.md')))
  const backups = readdirSync(join(tmp, 'backups'))
  check('backups 下出现快照目录', backups.length >= 1)

  const st = collectStatus(tmp, { denied: 2, touched: 3 })
  check('collectStatus 汇总文件与护栏计数', st.files.length === 3 && st.guard.denied === 2 && st.files.every((f) => typeof f.hash === 'string'))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log('F. 装配分区归属（按段名）')
check('本插件段名归属 ours', classifySectionName('dsh-custom:discipline') === 'ours')
check('已验证官方段名归属 official', classifySectionName('harness:identity') === 'official' && classifySectionName('deployment:persona') === 'official')
check('未识别段名归属 other', classifySectionName('some-plugin:thing') === 'other')
check('空名归属 other', classifySectionName('') === 'other')

console.log('G. 装配视图映射（buildAssemblyView）')
const fakeAsm = {
  sections: [
    { name: 'harness:identity', text: 'I' },
    { name: 'dsh-custom:discipline', text: 'D1' },
    { name: 'x:y', text: 'XY' },
  ],
  contexts: [{ name: 'env', text: 'ctx text' }],
  tools: [{ name: 'bash' }, { name: 'read' }],
  variables: { cwd: '/x', model: 'm' },
}
const bv = buildAssemblyView(fakeAsm, 'RENDERED', true)
check('分区映射 name/origin/chars 正确', bv.sections.length === 3 && bv.sections[0].origin === 'official' && bv.sections[1].origin === 'ours' && bv.sections[2].origin === 'other' && bv.sections[1].chars === 2)
check('上下文/工具/变量映射正确', bv.contexts.length === 1 && bv.contexts[0].chars === 8 && bv.tools.join(',') === 'bash,read' && bv.variables.join(',') === 'cwd,model')
check('渲染与降级字段透传', bv.rendered === 'RENDERED' && bv.rendererAvailable === true)

console.log('H. readAssembly 降级不变量')
{
  const view = await readAssembly({ assemble: async () => fakeAsm })
  check('渲染可用性与 rendered 保持一致', view.rendererAvailable === (view.rendered !== null))
}

console.log('I. HTTP 数据面（makeApi）')
function fakeRes() {
  return {
    code: null,
    headers: null,
    body: null,
    writeHead(code, headers) {
      this.code = code
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
  }
}
function fakeReq(method, url) {
  return { method, url }
}
async function callApi(api, method, url) {
  const res = fakeRes()
  await new Promise((resolve) => {
    const origEnd = res.end.bind(res)
    res.end = (body) => {
      origEnd(body)
      resolve()
    }
    api(fakeReq(method, url), res)
  })
  return { code: res.code, json: res.body ? JSON.parse(res.body) : null }
}
const svcFake = { assemble: async () => fakeAsm }
{
  const apiTmp = mkdtempSync(join(tmpdir(), 'dsh-custom-api-'))
  try {
    const api = makeApi(apiTmp, () => svcFake, { denied: 1, touched: 0 })
    const okA = await callApi(api, 'GET', '/api/dsh-custom/assembly')
    check('assembly 200 且 ok:true', okA.code === 200 && okA.json.ok === true && Array.isArray(okA.json.value.sections))
    const okS = await callApi(api, 'GET', '/api/dsh-custom/status')
    check('status 200 且含 root', okS.code === 200 && okS.json.ok === true && okS.json.value.root === apiTmp)
    const bad = await callApi(api, 'POST', '/api/dsh-custom/assembly')
    check('非 GET → 405', bad.code === 405 && bad.json.ok === false)
    const nf = await callApi(api, 'GET', '/api/dsh-custom/nope')
    check('未知路径 → 404', nf.code === 404)
    const noSvc = makeApi(apiTmp, () => null, { denied: 0, touched: 0 })
    const svcMissing = await callApi(noSvc, 'GET', '/api/dsh-custom/assembly')
    check('服务缺失 → 503', svcMissing.code === 503 && svcMissing.json.ok === false)
  } finally {
    rmSync(apiTmp, { recursive: true, force: true })
  }
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
