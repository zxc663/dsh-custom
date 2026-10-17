# 「DSH自定义 · 系统提示词管理」完全重构设计稿

> 版本：2026-10-17 · 设计阶段，不改实现
> 设计状态：可评审
> 交付形态：产品契约 + 状态图 + 静态设计图
> 依据：`dsh-custom-prompt-design-20261017.md`、当前 `client.js` / `src/index.ts`、Host Inspect、Shisan Xinuo Product 调研、UI/UX 设计技能调研。

## 0. 设计判断

### 0.1 一句话定位

**这是一个“真实装配检查台”，不是三个纵向表单。**

维护者先确认模型当前看到什么，再决定要不要改变内容；改变后必须看见作用域、校验、版本和恢复出口。

### 0.2 产品对象六问

| 问题 | 本次裁定 |
|---|---|
| Purpose | 管理和验证 DSH 的 system prompt 装配与可回滚自定义，解决“模型实际看到了什么”不可见和改动不可审计。 |
| Responsibility | **管理 system prompt 的查看、编辑、启停、作用域覆盖和恢复。**不负责输入框提示词润色、会话日志改写或执法规则本体。 |
| Capability | 实际装配查看、渲染/源码切换、段归属、会话作用域选择、complete 接管、干跑校验、快照/回滚、纪律前置、工作区覆盖、AGENTS 共存提示、状态/审计。 |
| Priority | 唯一主功能：**确认并管理当前实际 system prompt**。编辑属于高影响次级能力；审计/状态属于辅助能力。 |
| Completeness | 必须覆盖首开、加载、成功、保存中、保存失败、冲突、未知变量、外部改动、无会话、空内容、回滚和降级渲染。 |
| Operability | 数据源是 Host `systemPrompt` + 插件存储；维护者负责内容；页面负责校验、快照、冲突提示和回滚；默认 complete 关闭；异常时 fail-closed，不静默覆盖。 |

### 0.3 风险档位

**档 3**：含异步保存、complete 接管、回滚、作用域、冲突和模型可见结果。设计必须有 statechart、每个错误态恢复出口、运行时证据和回归走查。

## 1. 视觉方向

### 1.1 主题概念：Prompt Observatory / 提示词观测台

不做通用设置表单，也不做“代码编辑器皮肤”。视觉语言来自 DSH 的真实材料：段、顺序、作用域、版本、证据。

- **底色**：沿用宿主 `--dsw-alias-bg-base`，不引入独立背景色。
- **层级**：用宿主 `--dsw-alias-bg-layer-1/2` 和边界 token 表达“观测台卡层”，不使用玻璃拟态。
- **主色**：宿主 `--dsw-alias-brand-primary` 只用于当前选中、主动作和焦点；不能把成功色当品牌色。
- **状态**：success / warn / error 只负责状态，文字与图标同时出现。
- **排版**：宿主正文尺寸；段名、变量、版本号使用等宽字体；标题不额外加载网络字体，避免插件离线失真。
- **密度**：高信息密度但每个区域只服务一个问题；桌面三列，窄屏单列折叠。
- **签名元素**：顶部“装配指纹”条——显示作用域、模式、段数、变量和渲染状态，像一张可核对的运行快照。

### 1.2 反通用化检查

已否决：

1. 传统“区一/区二/区三”全部纵向堆叠：会让查看、编辑、审计互相争夺首屏。
2. 纯代码编辑器：会隐藏启停、作用域、版本和恢复语义。
3. 霓虹终端风：与宿主主题不一致，且会把高风险操作装饰成“酷”。

采用：**左侧能力导航 + 中央真实装配检查台 + 右侧影响/恢复抽屉**。高影响编辑通过二级工作台进入，不与只读检查争夺首屏。

## 2. 信息架构

```text
DSH自定义
├─ 概览（默认入口，主功能）
│  ├─ 当前装配指纹
│  ├─ 渲染/源码检查器
│  ├─ 段级归属与折叠详情
│  └─ 作用域/会话/模式选择
├─ 接管官方（complete）
│  ├─ 启用状态与独占冲突
│  ├─ Markdown 草案
│  ├─ 干跑校验
│  └─ 快照与回滚
├─ 纪律前置
│  ├─ 总开关
│  ├─ 全局文本
│  ├─ 工作区覆盖
│  └─ AGENTS.md 共存提示
└─ 证据与状态
   ├─ 存储与哈希
   ├─ 外部改动
   ├─ 护栏命中
   └─ 最近审计
```

**默认入口只回答一个问题：模型现在看到什么。** 编辑页只在用户明确进入时展开。

## 3. 页面结构规格

### 3.1 概览页（默认）

1. **页面标题栏**
   - 标题：`DSH自定义`
   - 副标题：`系统提示词管理`
   - 次操作：刷新
   - 刷新不重载页面壳，只更新当前 assembly 数据。

2. **装配指纹条（签名元素）**
   - 作用域：全局 / 会话 `fbe14060…`
   - 当前模式：标准 / 完全权限等宿主可见模式
   - 组成：22 段、N 个工具、N 个上下文、N 个变量
   - 渲染：在线 / 在线·容错 / 原文降级
   - 时间：生成时间
   - 任何项都可获得焦点并解释，不依赖颜色独立传达。

3. **主检查器**
   - 顶部 Segmented control：`渲染全文` / `分区源码`
   - 渲染全文：只读 `pre`，显示可复制动作和字符数。
   - 分区源码：段列表，每行包含顺序、段名、归属、字符数、展开按钮。
   - 当前外部段使用“其它外部”标识，不把未知来源冒充官方。

4. **右侧“影响面”栏（桌面）**
   - 当前注入：纪律开关、complete 开关
   - 生效时机：下一次真实组装
   - 可恢复：关闭接管 / 回滚快照
   - 冲突：若存在 complete 冲突，直接给出原因和出口。

5. **底部证据条**
   - 数据源：Host `systemPrompt.assemble()`
   - 渲染器：`renderPrompt` 状态
   - 当前文件哈希 / 外部改动
   - “查看审计”进入证据与状态页。

### 3.2 接管官方页

- 首屏先放**风险横幅**，不是先放编辑器：
  - 关闭：`当前使用官方装配`
  - 开启：`complete 接管中；本作用域仅允许一个有效 complete 段`
  - 冲突：`无法启用：检测到另一个 complete 段`
- 编辑器下方固定显示：
  - 未保存变更
  - 当前校验结果
  - 保存前快照
  - 生效时机
- 主动作只有一个：`保存并校验`。
- 次动作：`取材于当前装配`、`回滚到此版本`。
- 高风险动作必须带结果，不使用无意义 toast 代替结果。

### 3.3 纪律前置页

- 顶部总开关使用明确的 switch 语义：`允许将纪律文本作为 system 前置注入`。
- 文本编辑与“模型将看到的前 8 行”并排；窄屏上下堆叠。
- 作用域规则不是横向超宽表格，而是规则卡：
  - 匹配方式
  - 路径
  - 覆盖内容摘要
  - 当前优先级
  - 空正文时显示“该位置关闭”
- AGENTS 共存信息为提示卡，不提供接管或删除按钮；产品不接管用户文件。

## 4. 交互契约（六问）

| 行为 | 输入 | 时序/反馈 | 成功落点 | 失败→恢复→出口 | 可反悔 | 持久性 |
|---|---|---|---|---|---|---|
| 切换全局/会话作用域 | 选择器 | 立即显示加载骨架；1s 后仍未完成显示“正在读取” | 指纹与装配内容同时切换 | 会话不存在→说明“仅活跃会话可取”→回全局 | 可 | 仅视图，不写入 |
| 切换渲染/源码 | tab | 立即切换选中态 | 同一 assembly 的另一种表示 | 渲染不可用→转源码并解释原因 | 可 | 仅视图 |
| 展开段 | 点击/Enter/Space | 立即展开；不重新请求 | 该段正文可读 | 无 | 可 | 仅视图 |
| 开启 complete | 点击开关 | 先进入校验/冲突检查 | 接管状态变为启用 | 冲突/空文本→保持关闭→跳到冲突详情 | 可关闭 | 写 settings，下一次真实组装生效 |
| 保存 complete | 编辑文本 | >1s 显示“校验中”；不可重复提交 | 快照生成、草案落盘、结果行出现 | 未知变量/损坏→定位文本问题→保留草案，不覆盖旧值 | 回滚 | 快照+文件 |
| 回滚版本 | 点击版本行 | 显示“回滚前已快照” | 当前文本与开关状态更新 | 版本不存在/越界→不改当前→刷新版本列表 | 可再回滚 | 写快照+文件 |
| 保存纪律 | 编辑文本 | 保存前快照；按钮进入保存中 | 前 8 行预览与 mtime 更新 | 写入失败/外部改动→不覆盖→重新读取或重试 | 可回滚 | 文件 |
| 添加/保存作用域规则 | 路径、模式、文本 | 表单错误就地提示 | 规则排序和命中解释可见 | 非法路径/冲突→不写入→保留草案 | 删除规则可反悔前提是未保存 | 文件+快照 |
| 刷新 | 点击刷新 | 按钮进入刷新中 | 当前视图更新 | 网络/Host 错误→错误卡带重试 | 可 | 不写入 |

## 5. 六态矩阵

| 页面/能力 | loading | empty | error | edge | disabled | success |
|---|---|---|---|---|---|---|
| 概览 | 指纹骨架+段列表骨架 | 无段：说明“当前组装无可显示段” | Host/API 失败+重试 | 渲染容错、会话过期、变量无值 | 刷新中禁用重复请求 | 生成时间/数据源/段数明确 |
| complete | 校验中 | 空文本不可启用 | 未知变量、冲突、写入失败 | 多 complete、外部改动、长文本 | 保存/启用期间禁用 | 快照名、校验结果、生效说明 |
| 纪律 | 保存中 | 空正文=不注入（显式说明） | 写入失败、损坏 | AGENTS 重复、工作区位关 | 总开关关闭时编辑仍可保留草案 | 预览、mtime、快照 |
| 作用域 | 规则加载中 | 无规则=使用全局 | JSON 损坏/规则保存失败 | exact/prefix/contains/regex 优先级相同冲突 | 未填路径不可保存 | 命中规则、优先级、覆盖文本可见 |
| 证据 | 审计读取中 | 暂无审计 | 审计文件不可读 | 外部改动检测 | 只读 | 哈希、时间、来源、结果可复核 |

## 6. 状态机

机器可读版本见 `dsh-custom-prompt-statechart.json`。

主路径：

```text
ready
 ├─ selectScope → loadingAssembly → ready
 ├─ openOverride → overrideOff
 └─ openDiscipline → disciplineReady

overrideOff ── edit ──> overrideDraft
overrideDraft ── save ──> validatingOverride
validatingOverride ── pass ──> overrideSaved
validatingOverride ── unknown-variable/conflict/write-fail ──> overrideError
overrideError ── edit/retry ──> overrideDraft
overrideSaved ── enable ──> checkingConflict
checkingConflict ── pass ──> overrideEnabled
checkingConflict ── conflict/empty ──> overrideError
overrideEnabled ── disable ──> overrideOff
overrideSaved/overrideEnabled ── rollback ──> snapshotting → restoring → overrideSaved

纪律与作用域保存共用 saving → saved / error → retry/edit 的恢复语义。
```

## 7. 文字与反馈规则

- 主动作使用动词+结果：`保存并校验`、`启用接管`、`回滚此版本`。
- 不使用“提交”“应用一下”“同步中”等无法判断结果的词。
- 错误说明必须包含：发生了什么、现在是否改变、下一步怎么恢复。
- 容错渲染必须明确写出“当前显示的是原文，不代表渲染成功”。
- “模型将看到”只在真实 Host assembly 证据存在时使用；编辑器草案只能叫“草案”。

## 8. 运行时与实现边界

### 已确认

- Host `systemPrompt` 正式存在：`section({name, order, text, interpolate?, complete?})`；支持作用域同名遮蔽；`assemble()` 返回 `sections/contexts/tools/variables`；有效 complete 段最终恢复为唯一系统提示词段。
- 当前主题 token：`--dsw-alias-bg-base/bg-layer-1/bg-layer-2/bg-overlay/border-l1/border-l2/brand-primary/label-primary/label-secondary/state-error-primary/state-success-primary/state-warn-primary`。
- 现有客户端使用 React external、Slot 注册、同源 API，且已有 P0–P2 数据调用。

### 未确认（实现前必须重新查证）

- 当前 profile 中 `dsh-custom` Config status=absent；需先恢复插件挂载，再确认 Client bundle 是否加载。
- `Slots.listSubTree` 本轮超时，`settings.section` 与 `settings.plugins.tab` 不能当作当前 live 可用证据。
- 页面重构应先在真实 Client 注册后查 Slot catalog/occupants，再决定入口最终落点；不得凭历史文档直接写死。
- 本轮不新增 Service 名称、不把 Inspect Provider 当业务 Service、不调用猜测的业务方法。

## 9. 页面验收标准（Given / When / Then）

1. **真实装配优先**：Given 页面打开且 Host assembly 可用，When 选择全局或活跃会话，Then 指纹、段数、来源、变量和正文来自同一次 assembly；不存在“标签显示一套、正文来自另一套”的混合状态。
2. **安全保存**：Given complete 草案含未知变量或检测到冲突，When 用户点击 `保存并校验` 或 `启用接管`，Then 操作被阻止、旧文件不变、错误就地说明恢复路径。
3. **可回滚**：Given 已存在历史快照，When 用户点击 `回滚此版本`，Then 回滚前自动生成快照，恢复后的文本/开关状态重新读取并显示，失败不覆盖当前值。
4. **作用域明确**：Given 活跃会话存在工作区覆盖，When 选择该会话，Then 页面显示命中的覆盖来源与实际文本；When 切回全局，Then 全局文本恢复且不会残留会话覆盖。
5. **可访问与可恢复**：Given 键盘用户或弱网/错误状态，When 进行切换、保存、重试、回滚，Then 所有控件可聚焦且有名称，焦点不丢失，错误有可执行出口，不能出现无限 spinner 或无响应点击。

## 10. 证据与追溯

| 功能 | 页面元素 | 后端/数据 | 证据 |
|---|---|---|---|
| 实际装配查看 | 装配指纹、检查器、作用域选择器 | `systemPrompt.assemble()`、assembly API | runtime assembly JSON + 页面实机证据 |
| 来源辨识 | 段归属徽标、顺序/字符数 | sections + origin classifier | 段列表与原文对照 |
| complete 接管 | 风险横幅、编辑器、校验结果、开关 | override API、complete section | 422 负向、启用后 system/message |
| 回滚 | 版本行、回滚按钮、结果行 | backups restore API | pre-restore snapshot + restored assembly |
| 纪律前置 | switch、编辑器、预览 | discipline/settings API | 开关对照会话日志 |
| 作用域 | 规则卡、命中说明 | scope API、agent scope | 全局/工作区对照 |
| 审计状态 | 底部证据条、状态页 | status/audit/hash | 文件哈希与 audit 行 |

## 11. 决策账本

| 决定 | 被否候选 | 依据 | 影响/重开条件 |
|---|---|---|---|
| 工作台式重组 | 三个区纵向堆叠 | 现有页面职责混杂；主任务应先查看真实装配 | 若用户主要只编辑而不检查，可重评默认入口 |
| 首屏默认概览 | 默认打开 complete 编辑器 | 高影响操作不应遮住真实状态 | 若运营场景证明编辑频率远高于查看，重评导航优先级 |
| complete 默认关闭 | 默认开启 | 设计冻结稿拍板；互斥/空文本风险 | 仅在宿主提供独占保证并有迁移策略时重评 |
| 作用域作为指纹核心 | 藏在高级设置 | 作用域直接改变“模型看到什么” | 不重开，属于产品不变量 |
| 保留宿主主题 token | 独立黑绿终端皮肤 | Plugin UI 必须融入一个 Harness 应用；主题 token 是最低风险路径 | 若宿主发布新的主题契约，按 token 清单更新 |
| 入口先不写死 | settings.section / settings.plugins.tab 二选一直接实现 | 当前 live Slot Inspect 超时且 Config absent | 恢复 Client 连接后以 Slot catalog/occupants 证据裁定 |

## 12. 实现前停点

设计确认前不修改 `client.js`。

设计确认后第一批只做：

1. 恢复/确认插件 live 挂载和 Client bundle；
2. 查询目标 Slot 的 registration/catalog/occupants；
3. 将本稿拆成组件/状态映射与 spec-trace；
4. 先实现概览页骨架和完整六态，再迁移编辑能力；
5. 运行静态 lint/a11y 与真实 Client 走查。
