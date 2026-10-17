// dsh-custom（「DSH自定义」）P0 运行时半：
//   ① 存储骨架：$DSH_HOME/dsh-custom/（discipline.md / override.md / scope.json / meta.json / backups/ / audit.jsonl）
//   ② 防静默改写护栏（语义 b 的 P0 保守子集：拦截＋提示＋留痕；确认放行随 P2）
//   ③ 装配读取：ctx.systemPrompt.assemble() → 分区归属 + renderPrompt 实际渲染（只读）
//   ④ HTTP 数据面：/api/dsh-custom/{assembly,status}（webServer 服务；浏览器半 client.js 消费）
// 设计档：D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

// ── 路径与会话外定位 ──────────────────────────────────────────────

export function resolveHome(env: Record<string, string | undefined> = process.env): string {
  const h = env.DSH_HOME?.trim()
  return h && h.length > 0 ? h : join(homedir(), '.dsh')
}

export function storageRoot(env: Record<string, string | undefined> = process.env): string {
  return join(resolveHome(env), 'dsh-custom')
}

export function squash(p: string): string {
  return String(p ?? '').replace(/[\\/]+/g, '/').toLowerCase()
}

export function containsPath(haystack: string, root: string): boolean {
  const h = squash(haystack)
  const r = squash(root)
  if (r.length === 0) return false
  let i = 0
  while ((i = h.indexOf(r, i)) !== -1) {
    const nxt = h[i + r.length] ?? ''
    const prv = i > 0 ? h[i - 1] : ''
    if (!/[a-z0-9_.\-]/.test(nxt) && !/[a-z0-9_-]/.test(prv)) return true
    i += r.length
  }
  return false
}

export function isInsideStorage(candidate: string, root: string): boolean {
  return containsPath(candidate, root)
}

// ── 护栏判定（纯函数，可测）──────────────────────────────────────

const SHELL_TOOLS = new Set(['bash', 'shell', 'sh', 'powershell', 'pwsh', 'cmd', 'exec', 'run_command', 'terminal'])
const WRITE_TOOL_RE = /(write|edit|patch|create|mkdir|touch|move|rename|copy|delete|remove|unlink|erase|truncate|save|append|upload)/
// #决策 2026-10-17 15:46 护栏误报修复（D1）：原 `>\s*\S` 把 `2>&1` / `>$null` 这类流合并、空重定向
// 误判为文件写（实机误拦一条只读 pwsh 命令，证据=audit guard-deny 行）；写类短动词（del/rm/cp 等）
// 收窄为「命令位」匹配，防正文/路径片段误伤；PowerShell 长动词补齐 move/copy/rename/set-item。
const SHELL_WRITE_NAMES_RE = /(remove-item|set-content|add-content|out-file|new-item|clear-content|set-item|move-item|copy-item|rename-item|writefile|writealltext|writeallbytes|unlink|rmtree|os\.remove|shutil)/i
const SHELL_WRITE_VERB_RE = /(?:^|[\r\n;&|(){}'"`])\s*(?:rmdir|rename|erase|mkdir|move|copy|del|rd|rm|mv|cp|ren)(?=\s)/i
const SHELL_REDIRECT_RE = /(?<![=\-])>+[ \t]*(?!=)(?!&[0-9]|\$null\b|nul\b|\$env:NUL\b)(?=\S)/i

export function flattenStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') {
    out.push(v)
    return out
  }
  if (Array.isArray(v)) {
    for (const x of v) flattenStrings(x, out)
    return out
  }
  if (v && typeof v === 'object') {
    for (const x of Object.values(v as Record<string, unknown>)) flattenStrings(x, out)
  }
  return out
}

export interface GuardDecision {
  touches: boolean
  action: 'allow' | 'deny'
  reason?: string
}

export function guardDecision(toolName: string, args: unknown, root: string): GuardDecision {
  const name = String(toolName ?? '').toLowerCase()
  const blobs = flattenStrings(args)
  const touches = blobs.length > 0 && blobs.some((s) => containsPath(s, root))
  if (!touches) return { touches: false, action: 'allow' }

  const isShell = SHELL_TOOLS.has(name)
  const isWriteTool = !isShell && WRITE_TOOL_RE.test(name)
  const joined = isShell ? blobs.join(' ') : ''
  const shellWrites =
    isShell && (SHELL_WRITE_NAMES_RE.test(joined) || SHELL_WRITE_VERB_RE.test(joined) || SHELL_REDIRECT_RE.test(joined))

  if (isWriteTool || shellWrites) {
    return {
      touches: true,
      action: 'deny',
      reason:
        `「DSH自定义」护栏：目标位于插件存储 ${root}。语义 b＝允许改动但必须经提示/确认并留痕；` +
        `P0 保守子集先拦截（确认放行随 P2 交付）。请改用「DSH自定义」设置页管理，或先向用户说明意图再让用户放行。`,
    }
  }
  return { touches: true, action: 'allow' }
}

// ── 存储骨架 ─────────────────────────────────────────────────────

export interface StorageInfo {
  root: string
  created: string[]
}

const SEED_FILES: Record<string, string> = {
  'discipline.md': '',
  'override.md': '',
  'scope.json': '{\n  "version": 1,\n  "rules": []\n}\n',
  'settings.json': '{\n  "version": 1,\n  "injectEnabled": true\n}\n',
}

const TRACKED = ['discipline.md', 'override.md', 'scope.json', 'settings.json']

export function ensureStorage(root: string): StorageInfo {
  const created: string[] = []
  for (const d of [root, join(root, 'backups')]) {
    if (!existsSync(d)) {
      mkdirSync(d, { recursive: true })
      created.push(d)
    }
  }
  for (const [name, seed] of Object.entries(SEED_FILES)) {
    const p = join(root, name)
    if (!existsSync(p)) {
      writeFileSync(p, seed, 'utf8')
      created.push(p)
    }
  }
  const meta = join(root, 'meta.json')
  if (!existsSync(meta)) {
    writeFileSync(meta, JSON.stringify({ version: 1, hashes: {}, updatedAt: null }, null, 2) + '\n', 'utf8')
    created.push(meta)
  }
  return { root, created }
}

export function audit(root: string, entry: Record<string, unknown>): void {
  try {
    mkdirSync(root, { recursive: true })
    appendFileSync(join(root, 'audit.jsonl'), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', 'utf8')
  } catch (e) {
    // 留痕失败不阻断主流程；审计自身失败无法再入审计，降级到控制台兜底（#决策 2026-10-17 D2：不留空 catch）
    console.warn('[dsh-custom] audit 写入失败：', String((e as { message?: unknown })?.message ?? e))
  }
}

export function hashOfFile(p: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16)
  } catch (e) {
    // 文件不存在（ENOENT）属常态；其余读取失败须可见（#决策 2026-10-17 D2）
    const code = (e as { code?: unknown })?.code
    if (code !== 'ENOENT') console.warn(`[dsh-custom] 存储文件读取失败（${String(code ?? e)}）：${p}`)
    return null
  }
}

export interface ExternalChange {
  file: string
  from: string | null
  to: string | null
}

export function detectExternalChanges(root: string): ExternalChange[] {
  const metaPath = join(root, 'meta.json')
  let meta: { version?: number; hashes?: Record<string, string | null>; updatedAt?: string | null } = {}
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  } catch (e) {
    // meta 不存在（首启动）属常态；损坏/不可读须留痕（#决策 2026-10-17 D2）
    const code = (e as { code?: unknown })?.code
    if (code !== 'ENOENT') audit(root, { kind: 'meta-read-fail', detail: String(code ?? (e as { message?: unknown })?.message ?? e) })
    meta = {}
  }
  const prev = meta.hashes ?? {}
  const changes: ExternalChange[] = []
  const next: Record<string, string | null> = {}
  for (const f of TRACKED) {
    const h = hashOfFile(join(root, f))
    next[f] = h
    if (f in prev && prev[f] !== h) changes.push({ file: f, from: prev[f] ?? null, to: h })
  }
  meta.version = 1
  meta.hashes = next
  meta.updatedAt = new Date().toISOString()
  try {
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8')
  } catch (e) {
    audit(root, { kind: 'meta-write-fail', detail: String(e) })
  }
  for (const c of changes) audit(root, { kind: 'external-change', file: c.file, from: c.from, to: c.to })
  return changes
}

export function snapshot(root: string, reason: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '')
  const dir = join(root, 'backups', stamp)
  mkdirSync(dir, { recursive: true })
  const copied: string[] = []
  for (const f of TRACKED) {
    const src = join(root, f)
    if (existsSync(src)) {
      copyFileSync(src, join(dir, f))
      copied.push(f)
    }
  }
  audit(root, { kind: 'snapshot', reason, dir, files: copied })
  return dir
}

// ── 纪律前置：存储读写 / 开关 / 段注册（P1；#决策 2026-10-17 16:38）──

export const DISCIPLINE_SECTION = 'dsh-custom:discipline'
export const DISCIPLINE_ORDER = -2000

interface CachedFile { mtimeMs: number; text: string }
const fileCache = new Map<string, CachedFile>()

/** mtime 缓存的整文件读；变更即重读（热生效的底座）。 */
function readCachedFile(p: string): { text: string; mtimeMs: number } | null {
  try {
    const st = statSync(p)
    const hit = fileCache.get(p)
    if (hit !== undefined && hit.mtimeMs === st.mtimeMs) return { text: hit.text, mtimeMs: hit.mtimeMs }
    const text = readFileSync(p, 'utf8')
    fileCache.set(p, { mtimeMs: st.mtimeMs, text })
    return { text, mtimeMs: st.mtimeMs }
  } catch (e) {
    const code = (e as { code?: unknown })?.code
    if (code !== 'ENOENT') console.warn(`[dsh-custom] 读取失败（${String(code ?? e)}）：${p}`)
    fileCache.delete(p)
    return null
  }
}

/** 插件自身写入后登记哈希：避免下一次外部改动检测把本插件的写误报为会话外改动。 */
function recordHashes(root: string, files: string[]): void {
  const metaPath = join(root, 'meta.json')
  let meta: { version?: number; hashes?: Record<string, string | null>; updatedAt?: string | null } = {}
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  } catch (e) {
    const code = (e as { code?: unknown })?.code
    if (code !== 'ENOENT') audit(root, { kind: 'meta-read-fail', detail: String(code ?? e) })
    meta = {}
  }
  meta.version = 1
  meta.hashes = meta.hashes ?? {}
  for (const f of files) meta.hashes[f] = hashOfFile(join(root, f))
  meta.updatedAt = new Date().toISOString()
  try {
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8')
  } catch (e) {
    audit(root, { kind: 'meta-write-fail', detail: String((e as { message?: unknown })?.message ?? e) })
  }
}

export interface InjectSettings {
  enabled: boolean
  overrideEnabled: boolean
}

export function readInjectSettings(root: string): InjectSettings {
  const f = readCachedFile(join(root, 'settings.json'))
  if (f === null) return { enabled: true, overrideEnabled: false } // 缺失=纪律开/深改关（设计 §8.4）
  try {
    const j = JSON.parse(f.text) as { injectEnabled?: unknown; overrideEnabled?: unknown }
    return { enabled: j?.injectEnabled !== false, overrideEnabled: j?.overrideEnabled === true }
  } catch (e) {
    console.warn('[dsh-custom] settings.json 损坏，按默认（纪律开/深改关）处理：', String((e as { message?: unknown })?.message ?? e))
    return { enabled: true, overrideEnabled: false }
  }
}

export interface DisciplineState {
  enabled: boolean
  text: string
  sourceText: string
  mtime: string | null
}

export function readDiscipline(root: string): DisciplineState {
  detectExternalChanges(root) // 组装前哈希对照：会话外改动即留痕（设计 §4）
  const md = readCachedFile(join(root, 'discipline.md'))
  const sourceText = md?.text ?? ''
  const cfg = readInjectSettings(root)
  return {
    enabled: cfg.enabled,
    text: cfg.enabled ? sourceText : '',
    sourceText,
    mtime: md === null ? null : new Date(md.mtimeMs).toISOString(),
  }
}

export function saveDiscipline(root: string, text: string): DisciplineState {
  snapshot(root, 'save-discipline')
  writeFileSync(join(root, 'discipline.md'), text, 'utf8')
  recordHashes(root, ['discipline.md'])
  audit(root, { kind: 'discipline-saved', bytes: Buffer.byteLength(text, 'utf8') })
  return readDiscipline(root)
}

// ── 作用域覆盖（P1b；#决策 2026-10-17 17:2x）：全局默认＋单工作区可覆盖 ──
// 匹配口径复用近邻成熟裁定：完全一致/前缀/包含/正则；越具体越优先；空正文=在该位置关闭。

export const SCOPE_MODES = ['exact', 'prefix', 'contains', 'regex'] as const
export type ScopeMode = (typeof SCOPE_MODES)[number]
export interface ScopeRule {
  path: string
  mode: ScopeMode
  text: string
}
export interface ScopeState {
  version: number
  rules: ScopeRule[]
}

function ruleValid(r: unknown): r is ScopeRule {
  const rule = r as Partial<ScopeRule> | null
  return (
    rule !== null &&
    typeof rule === 'object' &&
    typeof rule.path === 'string' &&
    rule.path.length > 0 &&
    typeof rule.mode === 'string' &&
    (SCOPE_MODES as readonly string[]).includes(rule.mode) &&
    typeof rule.text === 'string'
  )
}

export function readScope(root: string): ScopeState {
  const f = readCachedFile(join(root, 'scope.json'))
  if (f === null) return { version: 1, rules: [] }
  try {
    const j = JSON.parse(f.text) as { rules?: unknown }
    const raw = Array.isArray(j?.rules) ? j.rules : []
    const rules = raw.filter((r) => {
      const ok = ruleValid(r)
      if (!ok) console.warn('[dsh-custom] scope.json 含无效规则，已跳过：', JSON.stringify(r).slice(0, 120))
      return ok
    })
    return { version: 1, rules }
  } catch (e) {
    console.warn('[dsh-custom] scope.json 损坏，按空规则处理：', String((e as { message?: unknown })?.message ?? e))
    return { version: 1, rules: [] }
  }
}

export function saveScope(root: string, rules: unknown): ScopeState {
  if (!Array.isArray(rules)) throw new Error('rules 必须是数组')
  const normalized = rules.map((r, i) => {
    if (!ruleValid(r)) throw new Error(`第 ${String(i + 1)} 条规则不合法（path 非空串；mode ∈ exact/prefix/contains/regex；text 为字符串）`)
    if (r.mode === 'regex') {
      try {
        new RegExp(r.path)
      } catch {
        throw new Error(`第 ${String(i + 1)} 条规则 regex 非法：${r.path}`)
      }
    }
    return { path: r.path, mode: r.mode, text: r.text }
  })
  snapshot(root, 'save-scope')
  writeFileSync(join(root, 'scope.json'), JSON.stringify({ version: 1, rules: normalized }, null, 2) + '\n', 'utf8')
  recordHashes(root, ['scope.json'])
  audit(root, { kind: 'scope-saved', rules: normalized.length })
  return { version: 1, rules: normalized }
}

const SCOPE_RANK: Record<ScopeMode, number> = { exact: 0, prefix: 1, contains: 2, regex: 3 }

/** 取最具体命中规则（exact > prefix > contains > regex；同级取更长者；再同级取先列者）。 */
export function pickScopeRule(rules: ScopeRule[], cwd: string | null | undefined): ScopeRule | null {
  if (rules.length === 0 || typeof cwd !== 'string' || cwd.length === 0) return null
  const c = squash(cwd)
  let best: { rule: ScopeRule; rank: number; len: number } | null = null
  for (const rule of rules) {
    if (!ruleValid(rule)) continue
    let hit = false
    let len = 0
    if (rule.mode === 'exact') {
      hit = c === squash(rule.path)
      len = rule.path.length
    } else if (rule.mode === 'prefix') {
      hit = c.startsWith(squash(rule.path))
      len = rule.path.length
    } else if (rule.mode === 'contains') {
      hit = c.includes(squash(rule.path))
      len = rule.path.length
    } else {
      try {
        hit = new RegExp(rule.path, 'i').test(cwd)
        len = rule.path.length
      } catch (e) {
        console.warn('[dsh-custom] 作用域 regex 无效，已跳过：', rule.path, String((e as { message?: unknown })?.message ?? e))
        continue
      }
    }
    if (!hit) continue
    const rank = SCOPE_RANK[rule.mode]
    if (best === null || rank < best.rank || (rank === best.rank && len > best.len)) best = { rule, rank, len }
  }
  return best === null ? null : best.rule
}

/**
 * 纪律注入文本解析（#决策 2026-10-17 P1b）：总开关关 → ''；命中工作区规则 → 规则文本（可空=该位置关）；
 * 无命中 → 全局默认（discipline.md）。cwd 缺省（全局引用）时不走规则。每次组装求值（热生效）。
 */
export function disciplineTextFor(root: string, cwd?: string | null): string {
  detectExternalChanges(root) // 组装前哈希对照（设计 §4）
  if (!readInjectSettings(root).enabled) return ''
  const rule = pickScopeRule(readScope(root).rules, cwd ?? null)
  if (rule !== null) return rule.text
  return readCachedFile(join(root, 'discipline.md'))?.text ?? ''
}

export function saveSettings(root: string, patch: { injectEnabled?: unknown; overrideEnabled?: unknown }): InjectSettings {
  const cur = readInjectSettings(root)
  const next = {
    enabled: typeof patch.injectEnabled === 'boolean' ? patch.injectEnabled : cur.enabled,
    overrideEnabled: typeof patch.overrideEnabled === 'boolean' ? patch.overrideEnabled : cur.overrideEnabled,
  }
  writeFileSync(join(root, 'settings.json'), JSON.stringify({ version: 1, injectEnabled: next.enabled, overrideEnabled: next.overrideEnabled }, null, 2) + '\n', 'utf8')
  recordHashes(root, ['settings.json'])
  audit(root, { kind: 'settings-saved', injectEnabled: next.enabled, overrideEnabled: next.overrideEnabled })
  return next
}

// ── 深改接管（P2；#决策 2026-10-17 18:0x）：complete 整段替换 ──────────

export const OVERRIDE_SECTION = 'dsh-custom:override'

export interface OverrideState {
  enabled: boolean
  text: string
  mtime: string | null
}

export function readOverride(root: string): OverrideState {
  const f = readCachedFile(join(root, 'override.md'))
  return {
    enabled: readInjectSettings(root).overrideEnabled,
    text: f?.text ?? '',
    mtime: f === null ? null : new Date(f.mtimeMs).toISOString(),
  }
}

/**
 * #决策 2026-10-17 18:0x 干跑校验：候选文本对「当前变量表」按宿主插入语义预渲染——未知/畸形变量阻止保存；
 * 已注册但离线无值的变量（如 {{model}}，请求期才解析）以占位值放行（设计 §2/§3 干跑口径）。
 * @returns null=通过；否则错误信息（可直接回显给用户）。
 */
export function validateOverrideText(
  text: string,
  variables: Record<string, unknown> | null | undefined,
  render?: ((assembly: unknown) => string) | null,
): string | null {
  const vars = variables ?? {}
  if (typeof render === 'function') {
    const filled: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(vars)) filled[k] = v === undefined ? `«${k}»` : v
    try {
      render({ sections: [{ name: OVERRIDE_SECTION, text }], contexts: [], tools: [], variables: filled })
      return null
    } catch (e) {
      return String((e as { message?: unknown })?.message ?? e)
    }
  }
  // 无 renderer 的兜底：按同语义做解析级检查（简单 {{name}} 组；未知名/畸形组阻止）
  const re = /\{\{([^{}]*)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const name = m[1] ?? ''
    if (!/^[a-z][a-z0-9_]*$/i.test(name)) return `畸形变量引用「{{${name}}}」（应为 {{name}} 形式）`
    if (!Object.hasOwn(vars, name)) {
      const known = Object.keys(vars)
      return `未知变量「{{${name}}}」；当前已注册变量：${known.length > 0 ? known.join('、') : '（无）'}`
    }
  }
  return null
}

export interface BackupEntry {
  name: string
  files: string[]
  hasOverride: boolean
}

export function listBackups(root: string): BackupEntry[] {
  const b = join(root, 'backups')
  if (!existsSync(b)) return []
  let names: string[] = []
  try {
    names = readdirSync(b).filter((n) => /^[0-9A-Za-z._-]+$/.test(n))
  } catch (e) {
    console.warn('[dsh-custom] 快照目录读取失败：', String((e as { message?: unknown })?.message ?? e))
    return []
  }
  return names
    .map((name) => {
      let files: string[] = []
      try {
        files = readdirSync(join(b, name))
      } catch (e) {
        console.warn(`[dsh-custom] 快照 ${name} 读取失败：`, String((e as { message?: unknown })?.message ?? e))
      }
      return { name, files, hasOverride: files.includes('override.md') }
    })
    .sort((x, y) => (x.name < y.name ? 1 : -1))
    .slice(0, 100)
}

/** 恢复快照（限 backups 根内；恢复前先对当前状态拍快照，保证可逆）。 */
export function restoreBackup(root: string, name: string): { restored: string[]; preRestoreSnapshot: string } {
  const b = resolve(join(root, 'backups'))
  const abs = resolve(b, name)
  if (abs !== b && !abs.startsWith(b + sep)) throw new Error('非法快照路径（越出 backups 根）')
  if (!existsSync(abs) || abs === b) throw new Error('快照不存在')
  const files = readdirSync(abs).filter((f) => (TRACKED as string[]).includes(f))
  if (files.length === 0) throw new Error('快照内无可恢复文件')
  const pre = snapshot(root, 'pre-restore')
  const restored: string[] = []
  for (const f of files) {
    copyFileSync(join(abs, f), join(root, f))
    restored.push(f)
  }
  recordHashes(root, restored)
  audit(root, { kind: 'backup-restored', name, files: restored })
  return { restored, preRestoreSnapshot: pre }
}

/** 注册深改接管段（complete 独占：整段替换系统提示词段列表；工具/上下文照常）。 */
export function registerOverride(svc: { section: (section: unknown) => () => void }, root: string): () => void {
  return svc.section({
    name: OVERRIDE_SECTION,
    order: 0,
    complete: true,
    text: () => readOverride(root).text,
  })
}

export function agentsCoexistence(home: string = resolveHome()): { exists: boolean; bytes: number | null; mtime: string | null } {
  const p = join(home, 'AGENTS.md')
  try {
    const st = statSync(p)
    return { exists: true, bytes: st.size, mtime: st.mtime.toISOString() }
  } catch (e) {
    const code = (e as { code?: unknown })?.code
    if (code !== 'ENOENT') console.warn(`[dsh-custom] AGENTS.md 状态读取失败（${String(code ?? e)}）`)
    return { exists: false, bytes: null, mtime: null }
  }
}

/**
 * 注册纪律前置段（system 层，order −2000 ⇒ 先于全官方面）。text 为函数：宿主每次组装时求值
 * （=热生效，改完无需推送；关/空 → 空文本，渲染期自动剔除 ⇒ 模型只见纯宿主提示词）。
 * 本函数注册「全局默认」层；工作区覆盖由 apply 中按 agent 作用域注册的同名段遮蔽（P1b）。
 */
export function registerDiscipline(svc: { section: (section: unknown) => () => void }, root: string): () => void {
  return svc.section({
    name: DISCIPLINE_SECTION,
    order: DISCIPLINE_ORDER,
    interpolate: false,
    text: () => disciplineTextFor(root, null),
  })
}

/** 按 agent 作用域注册同名纪律段（遮蔽全局；cwd 每次组装实时读取 ⇒ 位置转移自动跟随）。 */
export function registerDisciplineForAgent(agent: { ctx: { inject: (svcs: string[], cb: (scope: any) => void) => any }; session?: { header?: { cwd?: string } } }, root: string): unknown {
  return agent.ctx.inject(['systemPrompt'], (scope: any) => {
    scope.systemPrompt.section({
      name: DISCIPLINE_SECTION,
      order: DISCIPLINE_ORDER,
      interpolate: false,
      text: () => disciplineTextFor(root, agent?.session?.header?.cwd ?? null),
    })
  })
}

// ── 装配读取（只读视图数据面）────────────────────────────────────

// 一手证据（0.2.0-rc.2）：dsh-system-prompt 自带这两个段名（包内注册常量）。
// 其余官方段名清单随 dev-mount 冒烟实取快照扩充（见 memory/agent-log.md 流水）。
export const OUR_SECTION_PREFIX = 'dsh-custom:'
export const VERIFIED_OFFICIAL_SECTIONS = new Set(['harness:identity', 'deployment:persona'])

export type SectionOrigin = 'ours' | 'official' | 'other'

export function classifySectionName(name: string): SectionOrigin {
  const n = String(name ?? '')
  if (n.startsWith(OUR_SECTION_PREFIX)) return 'ours'
  if (VERIFIED_OFFICIAL_SECTIONS.has(n)) return 'official'
  return 'other'
}

export interface SectionView {
  name: string
  origin: SectionOrigin
  chars: number
  text: string
}

export interface AssemblyView {
  sections: SectionView[]
  contexts: Array<{ name: string; chars: number }>
  tools: string[]
  variables: string[]
  rendered: string | null
  rendererAvailable: boolean
  renderNote: string | null
  generatedAt: string
  scopeLabel: string
}

export function buildAssemblyView(
  asm: any,
  rendered: string | null,
  rendererAvailable: boolean,
  renderNote: string | null = null,
): AssemblyView {
  const sections: SectionView[] = (asm?.sections ?? []).map((s: any) => {
    const name = String(s?.name ?? '')
    const text = String(s?.text ?? '')
    return { name, origin: classifySectionName(name), chars: text.length, text }
  })
  return {
    sections,
    contexts: (asm?.contexts ?? []).map((c: any) => ({ name: String(c?.name ?? ''), chars: String(c?.text ?? '').length })),
    tools: (asm?.tools ?? []).map((t: any) => String(t?.name ?? '')).filter((n: string) => n.length > 0),
    variables: Object.keys(asm?.variables ?? {}),
    rendered,
    rendererAvailable,
    renderNote,
    generatedAt: new Date().toISOString(),
    scopeLabel: '全局（未附着会话作用域）',
  }
}

// ── 宿主渲染器加载（分层解析；逐级留痕，全失败降级为原文）────────────

export interface RendererModule {
  renderPrompt: (assembly: unknown) => string
}
export type RendererLoader = () => Promise<RendererModule | null>

const RENDERER_SPEC = '@deepseek-ai/dsh-system-prompt'
const dynImport = new Function('s', 'return import(s)') as (s: string) => Promise<any>

async function importRendererAt(from: string | URL): Promise<{ mod: RendererModule; path: string }> {
  const req = createRequire(from)
  const abs = req.resolve(RENDERER_SPEC)
  const mod = (await dynImport(pathToFileURL(abs).href)) as RendererModule
  return { mod, path: abs }
}

/**
 * #决策 2026-10-17 15:46 分层解析宿主渲染器：裸 import 在宿主内必失败——插件包经 junction 加载时
 * Node 把 import.meta.url 归一到 realpath（D:\DeepSeek\dsh-custom\…），裸说明符解析不到 profile 安装树。
 * 顺序：host-argv（宿主进程脚本的安装树，与运行中服务同源）→ ctx-baseUrl（profile 解析链）
 * → loader.internal.resolveSync（宿主内部 API 兜底）→ 模块自身位置 → 裸说明符。
 * 逐级失败落 audit（renderer-resolve-fail 带明细）；成功落 renderer-resolve（策略+路径）。
 */
export function makeRendererLoader(ctx: unknown, root: string | null): RendererLoader {
  let cached: Promise<RendererModule | null> | null = null
  return () =>
    (cached ??= (async () => {
      const c = ctx as { baseUrl?: unknown; loader?: { internal?: { resolveSync?: (...args: any[]) => any; version?: string } } } | null
      const tries: Array<{ strategy: string; run: () => Promise<{ mod: RendererModule; path: string }> }> = []
      const hostScript =
        typeof process.argv[1] === 'string' && process.argv[1].length > 0 && !process.argv[1].startsWith('-') ? process.argv[1] : null
      if (hostScript !== null) tries.push({ strategy: 'host-argv', run: () => importRendererAt(hostScript) })
      const baseUrl = typeof c?.baseUrl === 'string' ? c.baseUrl : null
      if (baseUrl !== null) {
        tries.push({
          strategy: 'ctx-baseUrl',
          run: () => importRendererAt(new URL('dsh-custom.resolve-probe.js', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)),
        })
      }
      const internal = c?.loader?.internal
      if (internal && typeof internal.resolveSync === 'function') {
        tries.push({
          strategy: 'loader-internal',
          run: async () => {
            const base = baseUrl ?? import.meta.url
            const resolved = internal.version === 'v2'
              ? internal.resolveSync(base, { specifier: RENDERER_SPEC, attributes: {} })
              : internal.resolveSync(RENDERER_SPEC, base, {})
            const url = typeof (resolved as { url?: unknown })?.url === 'string' ? String((resolved as { url: string }).url) : null
            if (url === null) throw new Error('resolveSync 未返回 url')
            const mod = (await dynImport(url)) as RendererModule
            return { mod, path: url }
          },
        })
      }
      tries.push({ strategy: 'module-url', run: () => importRendererAt(import.meta.url) })
      tries.push({ strategy: 'bare-import', run: async () => ({ mod: (await dynImport(RENDERER_SPEC)) as RendererModule, path: RENDERER_SPEC }) })

      const failures: string[] = []
      for (const t of tries) {
        try {
          const loaded = await t.run()
          if (typeof loaded.mod?.renderPrompt !== 'function') {
            failures.push(`${t.strategy}: 无 renderPrompt 导出`)
            continue
          }
          if (root !== null) audit(root, { kind: 'renderer-resolve', strategy: t.strategy, path: loaded.path, ok: true })
          return loaded.mod
        } catch (e) {
          const code = (e as { code?: unknown })?.code
          failures.push(`${t.strategy}: ${String(code ?? (e as { message?: unknown })?.message ?? e)}`)
        }
      }
      const detail = failures.join(' ｜ ')
      if (root !== null) audit(root, { kind: 'renderer-resolve-fail', detail })
      console.warn(`[dsh-custom] 宿主渲染器解析失败（渲染视图降级为原文）：${detail}`)
      return null
    })())
}

/**
 * #决策 2026-10-17 15:58 容错渲染（降级第二级）：离线全局视图拿不到请求期变量值
 * （如 `{{model}}` 在无会话上下文的 assemble 中注册但无值），宿主严格渲染随之抛错。
 * 容错语义＝与宿主同构的段级渲染，但未解析的 `{{name}}` 以原文保留并回报清单；
 * 严格渲染成功时绝不走此路径（优先保证与宿主逐字节一致）。
 */
export function renderPromptTolerant(assembly: any): { text: string; unresolved: string[] } {
  const variables = (assembly?.variables ?? {}) as Record<string, unknown>
  const unresolved = new Set<string>()
  const interp = (input: any): string => {
    const text = String(input?.text ?? '')
    if (input?.interpolate === false) return text
    return text.replace(/\{\{([^{}]*)\}\}/g, (raw: string, name: string) => {
      if (Object.hasOwn(variables, name) && variables[name] !== undefined) return String(variables[name])
      unresolved.add(`{{${name}}}`)
      return raw
    })
  }
  const sections = (assembly?.sections ?? []).map(interp).filter((t: string) => t.length > 0)
  return { text: sections.join('\n\n'), unresolved: [...unresolved] }
}

export async function readAssembly(
  svc: { assemble: (context?: unknown) => Promise<unknown> },
  loader?: RendererLoader,
  root?: string | null,
): Promise<AssemblyView> {
  const asm: any = await svc.assemble()
  let rendered: string | null = null
  let rendererAvailable = false
  let renderNote: string | null = null
  const useLoader: RendererLoader =
    loader ??
    (async () => {
      try {
        const mod = (await dynImport(RENDERER_SPEC)) as RendererModule
        return typeof mod?.renderPrompt === 'function' ? mod : null
      } catch (e) {
        // 无 ctx 环境（如离线测试）时的兜底路径：失败可预期，仍留痕（#决策 2026-10-17 D2）
        console.warn('[dsh-custom] 渲染器不可用（无 ctx 环境，渲染视图降级为原文）：', String((e as { message?: unknown })?.message ?? e))
        return null
      }
    })
  try {
    const mod = await useLoader()
    if (mod !== null) {
      rendererAvailable = true
      try {
        rendered = String(mod.renderPrompt(asm)) // 严格渲染＝宿主请求期同法（逐字节）
      } catch (strictError) {
        const detail = String((strictError as { message?: unknown })?.message ?? strictError)
        const fallback = renderPromptTolerant(asm)
        rendered = fallback.text
        renderNote =
          `严格渲染被运行时变量阻止（离线全局视图无会话上下文）；已容错渲染为近似文本：` +
          (fallback.unresolved.length > 0 ? `未解析变量 ${fallback.unresolved.join('、')} 以原文呈现` : '无未解析变量')
        if (root !== undefined && root !== null) audit(root, { kind: 'render-tolerate', reason: detail, unresolved: fallback.unresolved })
        console.warn('[dsh-custom] 严格渲染失败，已容错渲染：', detail)
      }
    }
  } catch (e) {
    console.warn('[dsh-custom] renderPrompt 调用失败（渲染视图降级为原文）：', String((e as { message?: unknown })?.message ?? e))
  }
  return buildAssemblyView(asm, rendered, rendererAvailable, renderNote)
}

// ── 状态读取（存储 + 护栏计数）────────────────────────────────────

export interface GuardStats {
  denied: number
  touched: number
}

export interface StatusView {
  root: string
  files: Array<{ name: string; hash: string | null; mtime: string | null; bytes: number | null }>
  externalChanges: ExternalChange[]
  guard: GuardStats
  note: string
}

export function collectStatus(root: string, stats: GuardStats): StatusView {
  const changes = detectExternalChanges(root)
  const files = TRACKED.map((name) => {
    let mtime: string | null = null
    let bytes: number | null = null
    try {
      const st = statSync(join(root, name))
      mtime = st.mtime.toISOString()
      bytes = st.size
    } catch (e) {
      // 文件不存在（ENOENT）属常态：hash 也会是 null；其余失败须可见（#决策 2026-10-17 D2）
      const code = (e as { code?: unknown })?.code
      if (code !== 'ENOENT') console.warn(`[dsh-custom] 存储文件状态读取失败（${String(code ?? e)}）：${name}`)
    }
    return { name, hash: hashOfFile(join(root, name)), mtime, bytes }
  })
  return {
    root,
    files,
    externalChanges: changes,
    guard: { denied: stats.denied, touched: stats.touched },
    note: 'P0 保守子集：模型写存储＝拦截＋提示＋留痕（语义 b 的确认放行随 P2 交付）',
  }
}

// ── HTTP 数据面（同源 /api/dsh-custom/*）──────────────────────────

function jsonResponse(res: any, code: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

function readJsonBody(req: any, limit = 1024 * 1024): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) {
        reject(new Error(`请求体过大（>${String(limit)} 字节）`))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.trim().length === 0) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(raw)
        resolve(parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {})
      } catch (e) {
        reject(new Error(`请求体不是 JSON：${String((e as { message?: unknown })?.message ?? e)}`))
      }
    })
    req.on('error', (e: unknown) => reject(e instanceof Error ? e : new Error(String(e))))
  })
}

export function makeApi(
  root: string,
  getService: () => { assemble: (context?: unknown) => Promise<unknown> } | null,
  stats: GuardStats,
  loader?: RendererLoader,
  onAccess?: () => void,
): (req: any, res: any) => void {
  const handlePut = (req: any, res: any, run: (body: Record<string, unknown>) => unknown): void => {
    readJsonBody(req)
      .then((body) => jsonResponse(res, 200, { ok: true, value: run(body) }))
      .catch((e: unknown) => jsonResponse(res, 400, { ok: false, error: String((e as { message?: unknown })?.message ?? e) }))
  }
  const access = (): void => {
    if (onAccess === undefined) return
    try {
      onAccess()
    } catch (e) {
      console.warn('[dsh-custom] 状态同步失败：', String((e as { message?: unknown })?.message ?? e))
    }
  }
  return (req: any, res: any) => {
    access()
    const method = String(req?.method ?? 'GET').toUpperCase()
    const pathname = String(req?.url ?? '').split('?')[0].replace(/\/+$/, '') || '/'
    if (pathname === '/api/dsh-custom/assembly') {
      if (method !== 'GET') {
        jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const svc = getService()
      if (!svc) {
        jsonResponse(res, 503, { ok: false, error: 'systemPrompt 服务尚不可用（宿主未提供或尚未就绪）' })
        return
      }
      readAssembly(svc, loader, root)
        .then((value) => jsonResponse(res, 200, { ok: true, value }))
        .catch((e: unknown) => jsonResponse(res, 500, { ok: false, error: String((e as { message?: unknown })?.message ?? e) }))
      return
    }
    if (pathname === '/api/dsh-custom/status') {
      if (method !== 'GET') {
        jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      try {
        jsonResponse(res, 200, { ok: true, value: collectStatus(root, stats) })
      } catch (e: unknown) {
        jsonResponse(res, 500, { ok: false, error: String((e as { message?: unknown })?.message ?? e) })
      }
      return
    }
    if (pathname === '/api/dsh-custom/discipline') {
      if (method === 'GET') {
        jsonResponse(res, 200, { ok: true, value: readDiscipline(root) })
        return
      }
      if (method === 'PUT') {
        handlePut(req, res, (body) => {
          if (typeof body.text !== 'string') throw new Error('text 必须是字符串')
          return saveDiscipline(root, body.text)
        })
        return
      }
      jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    if (pathname === '/api/dsh-custom/settings') {
      if (method === 'GET') {
        jsonResponse(res, 200, { ok: true, value: readInjectSettings(root) })
        return
      }
      if (method === 'PUT') {
        handlePut(req, res, (body) => saveSettings(root, { injectEnabled: body.injectEnabled }))
        return
      }
      jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    if (pathname === '/api/dsh-custom/scope') {
      if (method === 'GET') {
        jsonResponse(res, 200, { ok: true, value: readScope(root) })
        return
      }
      if (method === 'PUT') {
        handlePut(req, res, (body) => saveScope(root, body.rules))
        return
      }
      jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    if (pathname === '/api/dsh-custom/agents') {
      if (method !== 'GET') {
        jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      jsonResponse(res, 200, { ok: true, value: agentsCoexistence() })
      return
    }
    if (pathname === '/api/dsh-custom/override') {
      if (method === 'GET') {
        jsonResponse(res, 200, { ok: true, value: readOverride(root) })
        return
      }
      if (method === 'PUT') {
        const svc = getService()
        if (!svc) {
          jsonResponse(res, 503, { ok: false, error: 'systemPrompt 服务尚不可用（无法做干跑校验）' })
          return
        }
        readJsonBody(req)
          .then(async (body) => {
            if (typeof body.text !== 'string') throw new Error('text 必须是字符串')
            const asm = (await svc.assemble()) as { variables?: Record<string, unknown> } | null
            let render: ((a: unknown) => string) | null = null
            if (loader) {
              try {
                const mod = await loader()
                if (mod !== null) render = (a: unknown) => String(mod.renderPrompt(a))
              } catch (e) {
                console.warn('[dsh-custom] 干跑渲染器不可用，改用解析级校验：', String((e as { message?: unknown })?.message ?? e))
              }
            }
            const err = validateOverrideText(body.text, (asm?.variables ?? {}) as Record<string, unknown>, render)
            if (err !== null) {
              jsonResponse(res, 422, { ok: false, error: `干跑校验未通过：${err}` })
              return
            }
            snapshot(root, 'save-override')
            writeFileSync(join(root, 'override.md'), body.text, 'utf8')
            recordHashes(root, ['override.md'])
            audit(root, { kind: 'override-saved', bytes: Buffer.byteLength(body.text, 'utf8') })
            access()
            jsonResponse(res, 200, { ok: true, value: readOverride(root) })
          })
          .catch((e: unknown) => jsonResponse(res, 400, { ok: false, error: String((e as { message?: unknown })?.message ?? e) }))
        return
      }
      jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    if (pathname === '/api/dsh-custom/override/enable') {
      if (method !== 'PUT') {
        jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const svc = getService()
      if (!svc) {
        jsonResponse(res, 503, { ok: false, error: 'systemPrompt 服务尚不可用' })
        return
      }
      readJsonBody(req)
        .then(async (body) => {
          if (body.enabled !== true) {
            saveSettings(root, { overrideEnabled: false })
            access()
            audit(root, { kind: 'override-disabled' })
            jsonResponse(res, 200, { ok: true, value: readOverride(root) })
            return
          }
          if (readOverride(root).text.trim().length === 0) {
            jsonResponse(res, 409, { ok: false, error: '接管文本为空：请先保存「取材于当前」的非空文本再启用（空文本不放行，避免模型收到空提示词）' })
            return
          }
          saveSettings(root, { overrideEnabled: true })
          access()
          try {
            await svc.assemble() // 启用探测：complete 独占校验（多于一个 complete=组装失败）
            audit(root, { kind: 'override-enabled' })
            jsonResponse(res, 200, { ok: true, value: readOverride(root) })
          } catch (e) {
            const msg = String((e as { message?: unknown })?.message ?? e)
            saveSettings(root, { overrideEnabled: false })
            access()
            const m = /multiple complete prompt sections are active:\s*(.+)$/.exec(msg)
            if (m !== null) {
              const others = m[1]
                .split(',')
                .map((s) => s.trim().replace(/"/g, ''))
                .filter((n) => n.length > 0 && n !== OVERRIDE_SECTION)
              audit(root, { kind: 'override-conflict', others })
              jsonResponse(res, 409, {
                ok: false,
                error: `互斥冲突：作用域内已存在其它 complete 接管段（${others.length > 0 ? others.join('、') : '未识别名单'}）——请先停用对方再启用本接管（已自动回退为关闭）`,
                conflict: others,
              })
            } else {
              audit(root, { kind: 'override-conflict', others: [msg.slice(0, 200)] })
              jsonResponse(res, 409, { ok: false, error: `启用探测失败（已自动回退为关闭）：${msg}` })
            }
          }
        })
        .catch((e: unknown) => jsonResponse(res, 400, { ok: false, error: String((e as { message?: unknown })?.message ?? e) }))
      return
    }
    if (pathname === '/api/dsh-custom/backups') {
      if (method !== 'GET') {
        jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      jsonResponse(res, 200, { ok: true, value: { entries: listBackups(root) } })
      return
    }
    if (pathname === '/api/dsh-custom/backups/restore') {
      if (method !== 'PUT') {
        jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      handlePut(req, res, (body) => {
        if (typeof body.name !== 'string') throw new Error('name 必须是字符串')
        const result = restoreBackup(root, body.name)
        access()
        return result
      })
      return
    }
    jsonResponse(res, 404, { ok: false, error: 'not found' })
  }
}

// ── 插件装载 ─────────────────────────────────────────────────────

export function apply(ctx: any): () => void {
  const root = storageRoot()
  const info = ensureStorage(root)
  const changes = detectExternalChanges(root)
  const stats: GuardStats = { denied: 0, touched: 0 }
  audit(root, { kind: 'boot', created: info.created.length, externalChanges: changes.length })
  console.log(
    `[dsh-custom] P0 运行时已装载 | 存储=${root} | 新建=${info.created.length} | 检测到会话外改动=${changes.length}`,
  )
  console.log('[dsh-custom] 护栏：模型对存储区写入＝拦截＋提示＋留痕（P0 保守子集；语义 b 确认放行随 P2）')

  let service: { assemble: (context?: unknown) => Promise<unknown>; section: (section: unknown) => () => void } | null = null

  // P2：深改接管段动态注册（#决策 2026-10-17 18:0x：启用且文本非空才 wire；空文本不放行=防模型收到空提示词）
  let overrideWired: (() => void) | null = null
  const syncOverride = (): void => {
    if (service === null) return
    const shouldWire = readInjectSettings(root).overrideEnabled && readOverride(root).text.trim().length > 0
    if (shouldWire && overrideWired === null) {
      try {
        overrideWired = registerOverride(service, root)
      } catch (e) {
        overrideWired = null
        console.warn('[dsh-custom] 深改接管段注册失败：', String((e as { message?: unknown })?.message ?? e))
      }
    } else if (!shouldWire && overrideWired !== null) {
      try {
        overrideWired()
      } catch (e) {
        console.warn('[dsh-custom] 深改接管段注销失败：', String((e as { message?: unknown })?.message ?? e))
      }
      overrideWired = null
    }
  }
  ctx.effect(() => () => {
    if (overrideWired !== null) {
      try {
        overrideWired()
      } catch (e) {
        console.warn('[dsh-custom] 深改接管段清理失败：', String((e as { message?: unknown })?.message ?? e))
      }
      overrideWired = null
    }
  }, 'dsh-custom: override cleanup')

  ctx.inject(['systemPrompt'], (scoped: any) => {
    service = scoped.systemPrompt
    scoped.effect(() => registerDiscipline(scoped.systemPrompt, root), 'dsh-custom: discipline section')
    audit(root, { kind: 'sysprompt-attached', section: DISCIPLINE_SECTION, order: DISCIPLINE_ORDER })
    syncOverride()
  })

  // P1b：按 agent 作用域注册同名段（遮蔽全局；命中工作区规则即覆盖，cwd 实时读取 ⇒ 位置转移自动跟随）
  const scopedDisciplineFibers = new Map<unknown, unknown>()
  const installScopedDiscipline = (agent: any): void => {
    if (scopedDisciplineFibers.has(agent)) return
    try {
      scopedDisciplineFibers.set(agent, registerDisciplineForAgent(agent, root))
    } catch (e) {
      console.warn('[dsh-custom] 作用域纪律段注册失败：', String((e as { message?: unknown })?.message ?? e))
    }
  }
  ctx.inject(['agents'], (agentsCtx: any) => {
    for (const agent of agentsCtx.agents.list()) installScopedDiscipline(agent)
    agentsCtx.on('agent/created', ({ agent }: { agent: unknown }) => installScopedDiscipline(agent))
    agentsCtx.on('agent/disposed', ({ agent }: { agent: unknown }) => {
      const fiber = scopedDisciplineFibers.get(agent)
      if (fiber === undefined) return
      scopedDisciplineFibers.delete(agent)
      Promise.resolve((fiber as { dispose: () => unknown }).dispose()).catch((e: unknown) => {
        console.warn('[dsh-custom] 作用域纪律段清理失败：', String((e as { message?: unknown })?.message ?? e))
      })
    })
  })

  const rendererLoader = makeRendererLoader(ctx, root)

  ctx.inject(['webServer'], (scoped: any) => {
    const api = makeApi(root, () => service, stats, rendererLoader, syncOverride)
    scoped.effect(
      () => scoped.webServer.register({ kind: 'prefix', path: '/api/dsh-custom', handler: api }),
      'dsh-custom: api routes',
    )
    audit(root, { kind: 'api-mounted', path: '/api/dsh-custom' })
    console.log('[dsh-custom] 数据面已挂载：/api/dsh-custom/{assembly,status}')
  })

  const dispose = ctx.on(
    'tools/pre-execute',
    async (exec: { name?: string; arguments?: unknown }, next: () => Promise<unknown>) => {
      const d = guardDecision(exec?.name ?? '', exec?.arguments, root)
      if (d.action === 'deny') {
        stats.denied++
        audit(root, { kind: 'guard-deny', tool: exec?.name, reason: 'P0 保守子集：模型写存储' })
        console.log(`[dsh-custom] 护栏拦截：${exec?.name}`)
        return { kind: 'deny', reason: d.reason }
      }
      if (d.touches) {
        stats.touched++
        audit(root, { kind: 'storage-touch', tool: exec?.name })
      }
      return next()
    },
  )
  return dispose
}
