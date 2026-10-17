// dsh-custom（「DSH自定义」）P0 运行时半：
//   ① 存储骨架：$DSH_HOME/dsh-custom/（discipline.md / override.md / scope.json / meta.json / backups/ / audit.jsonl）
//   ② 防静默改写护栏（语义 b 的 P0 保守子集：拦截＋提示＋留痕；确认放行随 P2）
//   ③ 装配读取：ctx.systemPrompt.assemble() → 分区归属 + renderPrompt 实际渲染（只读）
//   ④ HTTP 数据面：/api/dsh-custom/{assembly,status}（webServer 服务；浏览器半 client.js 消费）
// 设计档：D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
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
}

const TRACKED = ['discipline.md', 'override.md', 'scope.json']

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

export function makeApi(root: string, getService: () => { assemble: (context?: unknown) => Promise<unknown> } | null, stats: GuardStats, loader?: RendererLoader): (req: any, res: any) => void {
  return (req: any, res: any) => {
    const method = String(req?.method ?? 'GET').toUpperCase()
    if (method !== 'GET') {
      jsonResponse(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    const pathname = String(req?.url ?? '').split('?')[0].replace(/\/+$/, '') || '/'
    if (pathname === '/api/dsh-custom/assembly') {
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
      try {
        jsonResponse(res, 200, { ok: true, value: collectStatus(root, stats) })
      } catch (e: unknown) {
        jsonResponse(res, 500, { ok: false, error: String((e as { message?: unknown })?.message ?? e) })
      }
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

  let service: { assemble: (context?: unknown) => Promise<unknown> } | null = null
  ctx.inject(['systemPrompt'], (scoped: any) => {
    service = scoped.systemPrompt
    audit(root, { kind: 'sysprompt-attached' })
  })

  const rendererLoader = makeRendererLoader(ctx, root)

  ctx.inject(['webServer'], (scoped: any) => {
    const api = makeApi(root, () => service, stats, rendererLoader)
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
