// 最小测试跑器：逐个执行 tests/*.test.mjs，聚合退出码（与主仓 run-all-tests 风格一致）
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const testsDir = join(here, '..', 'tests')
const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()

let failed = 0
for (const f of files) {
  console.log(`\n▶ ${f}`)
  const r = spawnSync(process.execPath, [join(testsDir, f)], { stdio: 'inherit' })
  if (r.status !== 0) failed++
}
console.log(failed === 0 ? `\n全部通过（${files.length} 个文件）` : `\n失败 ${failed}/${files.length} 个文件`)
process.exit(failed === 0 ? 0 : 1)
