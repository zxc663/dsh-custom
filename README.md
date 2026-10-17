# DSH自定义（dsh-custom）

系统提示词管理插件：**看清**每次组装实际可用的官方系统提示词、**深改**其内容（整段接管）、并把纪律文本前置到 system 层。

> 当前为 **P0 ＋ P1a ＋ P1b**：存储骨架 ＋ 防静默改写护栏（拦截＋提示＋留痕）＋ HTTP 数据面＋浏览器半（设置区「DSH自定义」独立条目）＋ **纪律前置**（注入开关/编辑器/热生效/AGENTS 共存提示）＋ **作用域覆盖**（全局默认＋单工作区规则：完全一致/前缀/包含/正则；空正文=该位置关闭）。
> 深改（complete 整段接管）随 P2 交付。设计档：
> `D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md`
> 交接文档（P0 现场、卡点、环境）：`D:/DeepSeek/dsh-plugin-dev/docs/handover-dsh-custom-20261017.md`

## 它做什么

- **区一 · 实际提示词**：调用 `ctx.systemPrompt.assemble()` 读取真实装配；`renderPrompt()` 渲染实际文本；分区标注官方/外挂（官方 order 集合）。
- **区三 · 纪律前置**（P1a 已交付）：`discipline.md` 文本 → `systemPrompt.section({ order: -2000, interpolate: false })` 前置到全官方提示词之前；页面提供**注入开关**（关=模型只见纯宿主提示词）、**编辑器**（保存前自动快照）、**增量预览**（前 8 行）；**热生效**（text 为函数，宿主每次组装重读——改完下一条消息即生效，无需重启/推送）；**AGENTS.md 共存信息提示**（只报告不接管）。
- **作用域覆盖**（P1b 已交付）：`scope.json` 工作区规则（路径＋匹配方式 exact/prefix/contains/regex＋文本；**空正文=该位置关闭**；**越具体越优先**：完全一致＞前缀＞包含＞正则）；命中即按 agent 作用域注册**同名段遮蔽全局**（`agent.ctx` 挂点），cwd 每次组装实时读取（会话换工作区自动跟随）；未命中回退全局默认。

## 存储（全局，插件自管）

```
$DSH_HOME/dsh-custom/
  discipline.md    区三：纪律前置文本（空 = 不注入）
  override.md      区二：深改覆盖（complete 接管时使用，P2）
  scope.json       作用域规则（P1b：工作区覆盖；空正文=该位置关；越具体越优先）
  settings.json    注入总开关（injectEnabled，默认开）
  meta.json        跟踪文件哈希（会话外改动检测）
  backups/<ts>/    每次保存前快照
  audit.jsonl      留痕：boot / guard-deny / storage-touch / external-change / snapshot /
                   discipline-saved / settings-saved / renderer-resolve(-fail) / render-tolerate
```

## 数据面与界面（P0＋P1a 已实现）

- **HTTP 数据面（宿主半）**：`GET /api/dsh-custom/assembly`（实际装配视图：分区＋归属＋渲染全文）｜`GET /api/dsh-custom/status`（存储/护栏/会话外改动）｜`GET|PUT /api/dsh-custom/discipline`（纪律文本读/写；写=快照＋落盘＋留痕）｜`GET|PUT /api/dsh-custom/settings`（注入开关）｜`GET|PUT /api/dsh-custom/scope`（工作区规则；写=快照＋留痕）｜`GET /api/dsh-custom/agents`（AGENTS.md 共存信息）。经 `ctx.inject(['webServer'])` 挂载（`server.register({kind:'prefix',…})`），浏览器半同源 fetch。
- **浏览器半（`client.js`）**：`window.__ModuleLoader__.load` 形态（仅依赖宿主 externals：react）；注册 `settings.section` 设置导航条目「DSH自定义」（id `dsh-custom`，order 30；2026-10-17 由「内置插件」分区页签移出——实机实测该页签本已注册可见，但入口层级过深、可见性不佳）；双视图＝装配全文（渲染）/分区源码；归属徽标 ours/official/other。
- **已验证（2026-10-17，桌面 App 实测·收口轮）**：①入口＝设置导航区「DSH自定义」一级条目（`settings.section`，order 30）实机可见；②渲染视图在线：宿主渲染器经分层解析（`host-argv→ctx-baseUrl→loader-internal→module-url→bare`）取宿主同源副本（App＝asar 内 0.2.1-rc.1），严格渲染被运行时变量阻止时转容错渲染（未解析 `{{变量}}` 原文呈现＋标注＋audit `render-tolerate`）；③护栏负向控制通过：真模型写存储被 `guard-deny` 拦截＋audit 留痕＋文件零改动（fail-closed）；④存储落盘/API 200/状态页脚全通。证据：`D:\tmp\dsh-custom-smoke\shot-09/10/11/13`＋`audit.jsonl`。
- **P1a 已验证（2026-10-17，桌面 App 实测）**：①开=模型可见前置纪律：注入后会话日志 `system/message` 首段即纪律文本（其后接官方身份行），模型逐字引用口令自证；②关=纯净（对照）：同会话下一轮 `system/message` 无纪律文本、模型核对后回答「没有」；③**热生效**：无需重启，同会话两轮之间开关切换即时生效（组装重发）；④编辑器保存产生快照＋`discipline-saved` 留痕；⑤AGENTS.md 共存提示实机显示（2463 字节）。证据：`shot-14/15/20/24/35`＋会话日志 `system/message` seq 对比＋`audit.jsonl`。
- **P1b 已验证（2026-10-17，桌面 App 实测·五态机证）**：同一会话日志 `system/message` 逐轮对比——装前无标记（seq=7）→ 全局注入（seq=38）→ 总开关关（seq=50）→ **工作区规则覆盖**（seq=62：前缀命中会话 cwd，规则文本遮蔽全局、全局不出现）→ **该位置关闭**（seq=76：空正文规则，全部不注入）；模型逐轮核对自证（引用规则文本／「全局不存在」／「都不存在」）。测试 78→**100/100**（匹配优先级/合成/API 22 例）。证据：`shot-37/38/39`＋会话日志 seq 对比＋`audit.jsonl`（scope-saved）。

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
