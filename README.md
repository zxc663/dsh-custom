# DSH自定义（dsh-custom）

系统提示词管理插件：**看清**每次组装实际可用的官方系统提示词、**深改**其内容（整段接管）、并把纪律文本前置到 system 层。

> 当前为 **P0**：存储骨架 ＋ 防静默改写护栏（拦截＋提示＋留痕）＋ HTTP 数据面＋浏览器半（设置区「DSH自定义」独立条目）。
> 深改（override / complete / 纪律注入）随 P1/P2 交付。设计档：
> `D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md`
> 交接文档（P0 现场、卡点、环境）：`D:/DeepSeek/dsh-plugin-dev/docs/handover-dsh-custom-20261017.md`

## 它做什么

- **区一 · 实际提示词**：调用 `ctx.systemPrompt.assemble()` 读取真实装配；`renderPrompt()` 渲染实际文本；分区标注官方/外挂（官方 order 集合）。
- **区二 · 纪律前置**（P1）：`discipline.md`＋指令行 → `systemPrompt.section({ order: -2000 })` 前置到全官方提示词之前。
- **区三 · AGENTS.md 共存**（信息提示、不施压）：只报告本机 `$DSH_HOME/AGENTS.md` 是否存在，迁移自愿。

## 存储（全局，插件自管）

```
$DSH_HOME/dsh-custom/
  discipline.md    区二：纪律前置文本（空 = 不注入）
  override.md      区一：深改覆盖（complete 接管时使用，P2）
  scope.json       作用域规则（全局默认 + 单工作区覆盖，P2）
  meta.json        跟踪文件哈希（会话外改动检测）
  backups/<ts>/    每次保存前快照
  audit.jsonl      留痕：boot / guard-deny / storage-touch / external-change / snapshot
```

## 数据面与界面（P0 已实现）

- **HTTP 数据面（宿主半）**：`GET /api/dsh-custom/assembly`（实际装配视图：分区＋归属＋渲染全文）｜`GET /api/dsh-custom/status`（存储/护栏/会话外改动）。经 `ctx.inject(['webServer'])` 挂载（`server.register({kind:'prefix',…})`），浏览器半同源 fetch。
- **浏览器半（`client.js`）**：`window.__ModuleLoader__.load` 形态（仅依赖宿主 externals：react）；注册 `settings.section` 设置导航条目「DSH自定义」（id `dsh-custom`，order 30；2026-10-17 由「内置插件」分区页签移出——实机实测该页签本已注册可见，但入口层级过深、可见性不佳）；双视图＝装配全文（渲染）/分区源码；归属徽标 ours/official/other。
- **已验证（2026-10-17，桌面 App 实测·收口轮）**：①入口＝设置导航区「DSH自定义」一级条目（`settings.section`，order 30）实机可见；②渲染视图在线：宿主渲染器经分层解析（`host-argv→ctx-baseUrl→loader-internal→module-url→bare`）取宿主同源副本（App＝asar 内 0.2.1-rc.1），严格渲染被运行时变量阻止时转容错渲染（未解析 `{{变量}}` 原文呈现＋标注＋audit `render-tolerate`）；③护栏负向控制通过：真模型写存储被 `guard-deny` 拦截＋audit 留痕＋文件零改动（fail-closed）；④存储落盘/API 200/状态页脚全通。证据：`D:\tmp\dsh-custom-smoke\shot-09/10/11/13`＋`audit.jsonl`。

## 护栏语义（已拍板：语义 b）

> **允许模型改动存储，但必须经提示/确认并留痕（防静默）。**
> P0 先交付保守子集：拦截＋提示＋留痕；确认放行随 P2 交付。

`tools/pre-execute` 钩子判定：目标命中存储区且属写类（write/edit 类工具或以写入动词组开头的 shell）→ `{kind:'deny', reason}`＋audit 留痕；只读触碰仅留痕不拦。

## 开发

```powershell
npm install        # devDependencies: typescript, @types/node
npm run build      # tsc → lib/
npm test           # node scripts/run-tests.mjs（直跑 src 的 .ts，node 24 type-stripping）
```

开发态挂载（临时 insert，按「撤除清单」登记）：见 `cordis.yml`（`file://` 直载 `src/index.ts`）。桌面 App 档现状＝junction（`profiles/node_modules/dsh-custom`→本仓）＋裸包名条目——撤除三步见交接文档 §4。

## 设计取舍备忘

- **不与 `$DSH_HOME/AGENTS.md` 竞争**：那是宿主原生通道；本插件只做 system 层，共存检查仅信息提示。
- **热更不推送**：文本改动仅在用户真实发送触发的组装时生效，无主动刷新通道。
- **参考近邻**（机制参照、不复制代码，避免 MIT/Apache 许可混同）：`dsh-agent-persona`。
- 英文名：`DSH Custom`；npm 名：`dsh-custom`（2026-10-17 查询为未占用，未发布）。

## License

MIT
