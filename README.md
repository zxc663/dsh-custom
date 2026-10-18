# DSH自定义（dsh-custom）

系统提示词管理插件：**看清**每次组装实际可用的官方系统提示词、**深改**其内容（整段接管）、并把纪律文本前置到 system 层。

> 当前为**主体能力全量交付**（P0＋P1a/P1b＋P2＋会话级覆盖＋页面重构＋审查改进批）：存储骨架＋防静默改写护栏（拦截＋提示＋留痕）＋ HTTP 数据面＋浏览器半（设置区「DSH自定义」独立条目）＋ **纪律前置**（注入开关/编辑器/热生效/AGENTS 共存提示）＋ **作用域覆盖**（全局默认＋单工作区规则）＋ **深度自定义**（complete 整段接管：干跑校验/快照回滚/互斥探测）＋ **5 页管理后台**（会话管理/系统提示词管理/快照与恢复/统计数据/治理开关；2026-10-18/19 多轮实机走查）＋ **会话级覆盖**（四段按 agent 作用域注册进装配：会话级 > 全局；system 空文本绝不注册）＋ **会话对话弹窗 / JSON 导入导出 / 快照时间线（全局＋各会话）/ 乐观锁（mtime 409 双路）/ 保存幂等**＋ **备份完整性**（layered 内容与启停表随快照与恢复）。
> 剩余可选项：英文文案等（导出/导入已于批次 B 交付）。设计档：
> `D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md`
> 交接文档（现状、决策账本、缺口）：`docs/handover-20261018.md`

## 它做什么（5 页管理后台）

- **会话管理**：左列表（工作区/模型/会话名——宿主真值投影）＋右详情 5 段（当前全文/前置纪律/我的提示词/整段接管/本会话覆盖）；会话级分段覆盖（留空=关闭该段；整段接管带影响确认）；回滚两档（上一版/官方）；**对话弹窗**（只读，过滤注入并标注「已隐藏 N 条」）；**导入/导出**（JSON v1，剪贴板＋边输入边预览，会话/作用域不匹配硬拒防串档）；「修改「X段」」跟随当前段。
- **系统提示词管理（全局）**：前置纪律（**附加**，不替换运行时核心）／我的提示词（order −1990，空=不注入）／渐进加载层（出厂副本＋用户镜像＋单节启停/恢复出厂/新增删除）／整段接管（complete 替换全部段：干跑校验＋将替换段清单＋粘性底栏）；全局导入/导出。
- **快照与恢复**：全局＋各会话时间线合并列出（保留最近 20 个自动清理）；详情（逐文件字节/行数/摘要，含 layered 分节）＋回滚（非破坏式；回滚前自动再快照）＋导出 JSON（2MB 上限兜底）。
- **统计数据**：护栏拦截/快照/活跃会话/页面外改动四卡＋动作流水（范围筛选：全部/7 天/今天；人话化＋「对你的影响」说明）。
- **治理开关**：L3 总闸＋10 危险域逐域开关（编码/解码执行固定开启）＋误拦白名单（词边界子串，最短 4 字符）＋判级与清单强制/压缩重载信号/收口即终结（含持久「待重启」徽标）；域目录**来自运行时引擎上报**（单一真源，镜像兜底）；写 `governance.json` → 引擎 mtime 热读（审批卡带白名单引导语）。

## 底层机制（三段装配＋作用域）

- **实际装配视图**：调用 `ctx.systemPrompt.assemble()` 读取真实装配；`renderPrompt()` 渲染实际文本（宿主逐字节同法）；可选 `?session=<id>` 按会话作用域实取（`assemble({agent, scope: agent})`）。归属标注 ours/official/other；严格渲染被运行时变量阻止时转容错渲染（未解析 `{{变量}}` 原文呈现＋标注＋audit `render-tolerate`）。
- **深度自定义**：`override.md` → `systemPrompt.section({ complete: true })` **整段接管**（合法深改，不动 asar）；干跑校验（未知/畸形 `{{变量}}` 阻止保存=422）、互斥检测（同 scope 其它 complete 段→拒绝启用并列名）。
- **纪律前置**：`discipline.md` → `section({ order: -2000 })` 前置（**附加**不替换运行时核心）；`user-prompt.md` → `section({ order: -1990 })`（空=不注入）；文本为函数，宿主每次组装重读（**热生效**，改完下一条消息即生效）。
- **作用域覆盖**：`scope.json` 工作区规则（exact/prefix/contains/regex；空正文=该位置关闭；越具体越优先）；命中即按 agent 作用域注册同名段遮蔽全局，cwd 实时读取（会话换工作区自动跟随）。
- **会话级覆盖**：`sessions/<id>/{discipline,user,layered,system}.md` 四段按 agent 作用域注册进装配（会话级 > 全局；system 为 complete 段且空文本绝不注册；保存/回滚后自动重同步）。

## 存储（全局，插件自管）

```
$DSH_HOME/dsh-custom/
  discipline.md       前置纪律文本（空 = 不注入）
  user-prompt.md      我的提示词（order −1990；空 = 不注入）
  override.md         整段接管文本（complete 整段替换；空文本不放行启用）
  scope.json          作用域规则（工作区覆盖；空正文=该位置关；越具体越优先）
  settings.json       开关（injectEnabled / userPromptEnabled / overrideEnabled）
  layered/            渐进加载层用户镜像与自建分节（随快照备份）
  layered-state.json  渐进层启停表（随快照备份；入 TRACKED）
  governance.json     治理开关（引擎 mtime 热读；不进快照=可再生态）
  l3-catalog.json     引擎启动上报的有效域目录（管理页优先读取）
  sessions/<id>/      会话级覆盖分段（discipline/user/layered/system.md）＋backups/
  meta.json           跟踪文件哈希（会话外改动检测）
  backups/<ts>/       每次保存前快照（保留最近 20 个；含 layered/ 与启停表；恢复非破坏式）
  audit.jsonl         留痕（boot / guard-deny / snapshot / snapshot-pruned / save-noop /
                      governance-* / layered-* / session-* / backup-restored 等）
```

## 数据面与界面（P0＋P1a 已实现）

- **HTTP 数据面（宿主半）**：`/api/dsh-custom/` 前缀下约 25 个端点，主干：`assembly`（装配视图；可选 `?session=` 会话作用域实取）｜`sessions`（含 title/model 宿主真值）＋`sessions/<id>/override|rollback|conversation`｜`discipline`／`user-prompt`／`override(+enable)`／`scope`／`settings`｜`layered`（列表/单节读写/reset/toggle）｜`governance(+allowlist)`｜`backups`（列表/detail/restore/export）｜`stats`／`audit`／`status`／`agents`。写路径统一带：保存前快照＋mtime 乐观锁（409=冲突，页面「重新加载/仍要覆盖」）＋内容未变自动跳过（`save-noop`）。经 `ctx.inject(['webServer'])` 挂载（`server.register({kind:'prefix',…})`），浏览器半同源 fetch。
- **浏览器半（`client.js`）**：`window.__ModuleLoader__.load` 形态（仅依赖宿主 externals：react）；注册 `settings.section` 设置导航条目「DSH自定义」（id `dsh-custom`，order 30）；**5 页管理后台**（会话管理/系统提示词管理/快照与恢复/统计数据/治理开关）＋ErrorBoundary 兜底＋弹窗焦点陷阱/Esc/aria＋保存幂等与防连点；仅用宿主主题 token（`--dsw-alias-*`）。
- **审查改进批 已验证（2026-10-19 实机走查）**：会话真值（宿主 title/model 投影三级回落）/窄栏页签 2 行/跨页防丢草稿；对话弹窗（隐藏注入计数）＋导入导出 JSON v1（预览/防串档）＋快照时间线（全局＋会话）＋乐观锁 409 双路；焦点三链（初始/循环/回焦）/字号 14px/保存幂等；治理面（P1-7 id 免迁移硬化/C5 脚本随包/C6 域目录引擎上报单一真源/C7 待重启徽标）；备份完整性（layered 内容与启停表入快照/恢复）。证据：`dsh-plugin-dev/memory/tmp/ui-review-fix-20261019/`（截图 26-49）＋各批 agent-log。测试：12 文件 **689 例**全绿。
- **批次三/四 已验证（2026-10-18 实机走查）**：8 区导航逐区渲染通过（备份并入快照区）；提示词中心三子区（常驻核心总开关/我的提示词空=不注入/渐进加载层指纹全一致）实机在位；user-prompt 段（order −1990）与 layered 用户镜像/停用/恢复经 25 例单测＋API 验证（跨插件契约：引擎侧用户目录优先＋mtime 热生效＋停用跳过注入）。证据：`D:/tmp/wt-20261018-a/03..12b-*.png`＋`audit.jsonl`。测试 132→**157/157**。（注：当时「治理=诚实占位」已由 2026-10-18 治理开关批转为实功能。）
- **已验证（2026-10-17，桌面 App 实测·收口轮）**：①入口＝设置导航区「DSH自定义」一级条目（`settings.section`，order 30）实机可见；②渲染视图在线：宿主渲染器经分层解析（`host-argv→ctx-baseUrl→loader-internal→module-url→bare`）取宿主同源副本（App＝asar 内 0.2.1-rc.1），严格渲染被运行时变量阻止时转容错渲染（未解析 `{{变量}}` 原文呈现＋标注＋audit `render-tolerate`）；③护栏负向控制通过：真模型写存储被 `guard-deny` 拦截＋audit 留痕＋文件零改动（fail-closed）；④存储落盘/API 200/状态页脚全通。证据：`D:\tmp\dsh-custom-smoke\shot-09/10/11/13`＋`audit.jsonl`。
- **P1a 已验证（2026-10-17，桌面 App 实测）**：①开=模型可见前置纪律：注入后会话日志 `system/message` 首段即纪律文本（其后接官方身份行），模型逐字引用口令自证；②关=纯净（对照）：同会话下一轮 `system/message` 无纪律文本、模型核对后回答「没有」；③**热生效**：无需重启，同会话两轮之间开关切换即时生效（组装重发）；④编辑器保存产生快照＋`discipline-saved` 留痕；⑤AGENTS.md 共存提示实机显示（2463 字节）。证据：`shot-14/15/20/24/35`＋会话日志 `system/message` seq 对比＋`audit.jsonl`。
- **P1b 已验证（2026-10-17，桌面 App 实测·五态机证）**：同一会话日志 `system/message` 逐轮对比——装前无标记（seq=7）→ 全局注入（seq=38）→ 总开关关（seq=50）→ **工作区规则覆盖**（seq=62：前缀命中会话 cwd，规则文本遮蔽全局、全局不出现）→ **该位置关闭**（seq=76：空正文规则，全部不注入）；模型逐轮核对自证（引用规则文本／「全局不存在」／「都不存在」）。测试 78→**100/100**（匹配优先级/合成/API 22 例）。证据：`shot-37/38/39`＋会话日志 seq 对比＋`audit.jsonl`（scope-saved）。
- **P2 已验证（2026-10-17，桌面 App 实测·机证为准）**：①干跑负向：含 `{{bogus}}` 的候选保存被 **422 阻断**；②**接管生效机证**：启用后会话日志 `system/message`（seq=87）**只有接管文本**——官方身份行消失、`{{model}}` 于请求期解析为真实模型名（同轮弱模型自答"不存在/identity 存在"为**谎报**，机证推翻；再次实证「模型自述不可信、机证为准」）；③**关=恢复官方逐字一致**（sections 名+字数与接管前基线全等）；④**回滚实测**：快照列表→一键回滚（`backup-restored` 四文件、settings 同步重放、回滚前自动 pre-restore 快照）；⑤互斥检测（409 列对方段名）=单测覆盖（本机无第二个 complete 可做现场对照，如实登记）。测试 100→**128/128**。证据：`shot-40/41/42`＋会话日志 seq=87＋`audit.jsonl`（override-saved/enabled/conflict/backup-restored）。
- **会话/档位级实取视图 已验证（2026-10-17，桌面 App 实测）**：作用域选择器切到活跃会话后——元信息示「会话 fbe14060｜D:\DeepSeek\dsh-plugin-dev（作用域实取）」；首段为该会话的工作区覆盖行（SV-5，vs 全局 GV-1）；**22 段全景**（含 tool:* / plan:policy / file-reference 等会话作用域段）＋沙箱/审批策略上下文（档位差异可见）；**变量表带值**：`{{model}}` 按该会话真实解析（longcat-2.5-preview-free）、渲染器在线（非容错）＝宿主逐字节同法。证据：`shot-46/47`＋API 双查（全局/会话对照）。测试 128→**132/132**。

## 护栏语义（语义 b · 当前为保守子集）

> **目标是允许模型改动存储但必须经提示/确认并留痕（防静默）**；当前交付保守子集：**模型写存储＝拦截＋提示＋留痕**，确认放行通道未交付（人经页面编辑不受影响）。

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
