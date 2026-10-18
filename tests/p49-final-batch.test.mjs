// 收尾批回归（P1-10 幂等）：内容未变 → 不重写、不建快照、不碰 mtime；审计留 save-noop；
// 会话分段逐段去重（只写变化段）；API 级 PUT 重复提交同样被跳过。
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  apply,
  ensureStorage,
  mtimeOfFileOrNull,
  saveDiscipline,
  saveUserPrompt,
  sessionDir,
  writeSessionOverride,
  readSessionOverride,
} from '../src/index.ts'

let pass = 0
let fail = 0
const lines = []
function t(name, expect, actual) {
  const e = JSON.stringify(expect)
  const a = JSON.stringify(actual)
  if (e === a) {
    pass++
    lines.push(`PASS ${name}`)
  } else {
    fail++
    lines.push(`FAIL ${name}\n  expect=${e}\n  actual=${a}`)
  }
}

function callApi(api, method, url, body) {
  return new Promise((done) => {
    const payload = JSON.stringify(body ?? {})
    const req = {
      method,
      url,
      on: (ev, cb) => {
        if (ev === 'data') setTimeout(() => cb(Buffer.from(payload)), 0)
        else if (ev === 'end') setTimeout(() => cb(), 3)
      },
    }
    const res = {
      code: 0,
      writeHead(c) { this.code = c },
      end(b) { done({ code: this.code, body: JSON.parse(String(b)) }) },
    }
    api(req, res)
  })
}

function bootHost() {
  const home = mkdtempSync(join(tmpdir(), 'dshc-p49-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const sections = []
  const scope = {
    sections,
    systemPrompt: {
      section(cfg) { sections.push(cfg); return () => {} },
      assemble: async () => ({ variables: {} }), // override 干跑校验用（无 renderer 走解析级检查）
    },
    effect(fn) { const d = fn(); return { dispose() { if (typeof d === 'function') d() } } },
    fiber(cb) { cb(scope); return { dispose() {} } },
  }
  const agentsApi = { list: () => [], get: () => null, on: () => () => {} }
  const routes = []
  const ctx = {
    effect(fn) { const d = fn(); return { dispose() { if (typeof d === 'function') d() } } },
    inject(svcs, cb) {
      const name = svcs[0]
      if (name === 'systemPrompt') { cb(scope); return { dispose() {} } }
      if (name === 'agents') { cb({ agents: agentsApi, on: () => () => {} }); return { dispose() {} } }
      if (name === 'webServer') {
        cb({ webServer: { register: (route) => { routes.push(route); return () => {} } }, effect: (fn) => { const d = fn(); return { dispose() { if (typeof d === 'function') d() } } } })
        return { dispose() {} }
      }
      return { dispose() {} }
    },
    on: () => () => {},
  }
  const origLog = console.log
  console.log = () => {}
  try { apply(ctx) } finally { console.log = origLog }
  return {
    root: join(home, 'dsh-custom'),
    api: routes[0].handler,
    restore() {
      if (prevHome === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = prevHome
      rmSync(home, { recursive: true, force: true })
    },
  }
}

const snapCount = (root) => {
  try { return readdirSync(join(root, 'backups')).filter((n) => /^\d{4}-\d{2}-\d{2}T/.test(n)).length } catch { return 0 }
}
const noopCount = (root) => {
  try { return readFileSync(join(root, 'audit.jsonl'), 'utf8').split('\n').filter((l) => l.includes('"save-noop"')).length } catch { return 0 }
}

// ══════════════════════════════════════════════════════════════════
// 1. 函数级：saveDiscipline / saveUserPrompt 去重
// ══════════════════════════════════════════════════════════════════
{
  const root = mkdtempSync(join(tmpdir(), 'dshc-p49-fn-'))
  try {
    ensureStorage(root)
    saveDiscipline(root, '纪律A')
    const n1 = snapCount(root)
    const m1 = mtimeOfFileOrNull(join(root, 'discipline.md'))
    saveDiscipline(root, '纪律A')
    t('discipline: 同内容第二次保存不建快照', n1, snapCount(root))
    t('discipline: mtime 未被触碰', m1, mtimeOfFileOrNull(join(root, 'discipline.md')))
    t('discipline: 有 save-noop 留痕', 1, noopCount(root))
    saveDiscipline(root, '纪律B')
    t('discipline: 内容变化正常建快照', n1 + 1, snapCount(root))

    saveUserPrompt(root, '提示词U', true)
    const n2 = snapCount(root)
    saveUserPrompt(root, '提示词U', true)
    t('user-prompt: 内容与开关均同 → 不建快照', n2, snapCount(root))
    saveUserPrompt(root, '提示词U', false)
    t('user-prompt: 仅开关变化 → 建快照（真实变更）', n2 + 1, snapCount(root))

    // 会话分段逐段去重
    const id = 'session-dedup'
    const r1 = writeSessionOverride(root, id, { discipline: 'D1', user: 'U1' })
    t('会话: 首写 written=两段', ['discipline', 'user'], r1.written.slice().sort())
    t('会话: 首写无旧状态 → 无快照（无可保护对象）', null, r1.snapshot)
    const r2 = writeSessionOverride(root, id, { discipline: 'D1' })
    t('会话: 同内容重写 written=[]', [], r2.written)
    t('会话: 同内容重写 snapshot=null', null, r2.snapshot)
    const r3 = writeSessionOverride(root, id, { discipline: 'D1', user: 'U2' })
    t('会话: 仅变化段写入（user）', ['user'], r3.written)
    t('会话: 变更时有旧状态 → 建快照', true, typeof r3.snapshot === 'string')
    const r4 = writeSessionOverride(root, id, { discipline: '' })
    t('会话: 清空变化段正常删除', ['discipline'], r4.written)
    t('会话: 删除后文件不存在', null, readSessionOverride(root, id).discipline)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

// ══════════════════════════════════════════════════════════════════
// 2. API 级：PUT 重复提交被跳过（discipline / override）
// ══════════════════════════════════════════════════════════════════
{
  const host = bootHost()
  try {
    const p1 = await callApi(host.api, 'PUT', '/api/dsh-custom/discipline', { text: 'API纪律' })
    t('API discipline: 首写 200', 200, p1.code)
    const n1 = snapCount(host.root)
    const p2 = await callApi(host.api, 'PUT', '/api/dsh-custom/discipline', { text: 'API纪律' })
    t('API discipline: 重复写 200', 200, p2.code)
    t('API discipline: 不建快照', n1, snapCount(host.root))
    t('API discipline: save-noop 留痕', 1, noopCount(host.root))

    const o1 = await callApi(host.api, 'PUT', '/api/dsh-custom/override', { text: 'OV-DEDUP' })
    t('API override: 首写 200', 200, o1.code)
    const n2 = snapCount(host.root)
    const o2 = await callApi(host.api, 'PUT', '/api/dsh-custom/override', { text: 'OV-DEDUP' })
    t('API override: 重复写 200', 200, o2.code)
    t('API override: 响应带 skipped 标记', true, o2.body.skipped === true)
    t('API override: 不建快照', n2, snapCount(host.root))
    t('API override: save-noop 留痕', 2, noopCount(host.root))
  } finally {
    host.restore()
  }
}

// ══════════════════════════════════════════════════════════════════
// 3. P1-7 免迁移硬化：非规范 id 目录名加短哈希（防 a/b 与 ab 撞车）；规范 id 目录名不变
// ══════════════════════════════════════════════════════════════════
{
  const root = mkdtempSync(join(tmpdir(), 'dshc-p49-p17-'))
  try {
    ensureStorage(root)
    const d1 = sessionDir(root, 'a/b')
    const d2 = sessionDir(root, 'ab')
    t('P1-7: a/b 与 ab 不再撞车', true, d1 !== d2)
    t('P1-7: 同 id 确定性稳定', d1, sessionDir(root, 'a/b'))
    t('P1-7: 非规范 id 落 -x 短哈希后缀', true, /-x[0-9a-f]{8}$/.test(d1))
    t('P1-7: 规范 id 目录名不变（零迁移）', join(root, 'sessions', 'session-abc'), sessionDir(root, 'session-abc'))
    writeSessionOverride(root, 'a/b', { discipline: 'X' })
    t('P1-7: 非规范 id 读写闭环', 'X', readSessionOverride(root, 'a/b').discipline)
    t('P1-7: 净化撞名 id 互不影响', null, readSessionOverride(root, 'ab').discipline)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

console.log(lines.join('\n'))
console.log(`\n=== p49-final-batch: ${pass} pass / ${fail} fail ===`)
process.exit(fail > 0 ? 1 : 0)