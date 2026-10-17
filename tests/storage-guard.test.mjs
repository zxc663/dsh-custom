// P0 单测：存储骨架 / 防静默改写护栏（语义 b 保守子集）/ 会话外改动留痕 / 装配归属判定
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  containsPath,
  detectExternalChanges,
  ensureStorage,
  guardDecision,
  hashOfFile,
  resolveHome,
  snapshot,
  squash,
  storageRoot,
  classifySection,
  OFFICIAL_ORDERS,
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
check('存根目录本身命中', containsPath(ROOT, ROOT))
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

  const h1 = hashOfFile(join(tmp, 'discipline.md'))
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
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log('F. 装配分区归属')
check('官方 order 归属 official', classifySection({ order: -1000, name: 'harness:identity' }) === 'official' && OFFICIAL_ORDERS.has(-1000))
check('外部 order 归属 external', classifySection({ order: -2000, name: 'shisanxinuo:discipline' }) === 'external')
check('缺 order 归属 external', classifySection({ name: 'x' }) === 'external')

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
