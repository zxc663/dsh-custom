# DSH 插件 UI 实现专项调研

> 目的：纠正上一版原型没有以真实 DSH 插件 UI 实现为依据的问题。
> 状态：只读调研，已用于产品重构 v2。

## 1. 当前运行时 Inspect 证据

### `settings.section`

- available=true
- purpose：One settings page per list entry
- current occupants：`general`、`models`、`plugins`、`agent-presets`、`dsh-custom`
- `dsh-custom` order=30，active=true
- registration：`id`、`order`、`label`
- owner prop：`close()`
- standard hooks：`useRemoteAccess`、`useResource`、`useWorkspaces`、`usePanelInfo`、`useSessions`、`useSessionStatus`、`useSessionRetainInfo`、`useSessionAccess`、`useWorkspaceAccess`

结论：完整的系统提示词管理产品应优先使用 `settings.section`，因为它是宿主定义的完整设置页面入口。

### `settings.plugins.tab`

- available=true
- purpose：One page inside the Plugins settings section
- current occupant：`all`，registrant=Kb，active=true
- owner props 为空
- registration：`id`、`order`、`label`

结论：适合作为插件页内的轻量 Tab 或兼容入口，不适合作为完整生命周期治理产品的唯一主承载面。

### 当前插件注册状态

Host Config Inspect：`include:dsh-custom` status=`absent`。这表示当前 Host 配置目录没有把本插件作为 live Config entry 解析出来；不能把 Slot occupant 的历史/临时注册等同于完整插件安装和 GUI 已验收。

## 2. 真实源码/包级 UI 证据

### `dsh-our-free-model`

来源：本机插件源码 `D:\ai本地模型\dsh\plugins-src\dsh-our-free-model\client.js`。

- `window.__ModuleLoader__.load({ id, factory })`
- `inject=['slots','locale']`
- `settings.section` 注册完整设置页
- 同源 API fetch
- `AbortController` 和超时
- 显式 `loading / error / retry`
- 状态包含 available / blocked / unavailable / throttled / unknown
- 使用宿主 `--dsw-alias-*` token 和 fallback
- 另有 onboarding announcement slot

设计借鉴：异步请求必须可取消/超时，错误必须有重试；产品状态不能只靠颜色。

### `dsh-permission-rules`

来源：已安装实包 `D:\ai本地模型\dsh\headless-home\profiles\permtest\node_modules\dsh-permission-rules\lib\client.js`。

- `settings.section` 注册
- 通过 typed remote bridge 读取、保存、reload
- `result.ok=false` 显式转错误
- 规则编辑器带网络状态、阻断计数、保存/reload 失败文案

设计借鉴：复杂治理插件优先使用 typed remote / Host bridge，不将所有数据逻辑塞进 Client fetch。

### 官方 `@deepseek-ai/dsh-client-ui-settings-agent-loop`

来源：本机 npm cache 构建产物 `lib/client.js`。

- `SettingsForm`
- `SettingsValueField`
- staged edit
- save / discard / reset
- invalid
- writable disabled
- `configForms.get('agent-loop')`
- `configForms.whileServed`
- `plugins.item` 卡片入口

设计借鉴：DSH 官方配置页面的基本契约是暂存、保存、丢弃、恢复默认和非法输入阻止保存。

### 官方 `@deepseek-ai/dsh-client-ui-settings-models`

来源：本机 npm cache 构建产物 `lib/client.js`。

- typed remote + configForms + store
- provider card
- busy/failure
- credentials / provider / connection 状态
- `settings.section` 完整页面
- keyed card slot 和 footer slot
- 动态刷新事件

设计借鉴：复杂页面按数据域拆分 card/slot，不能继续使用单体 467 行 React factory 承载全部状态。

## 3. 生态配置入口调研

来源：[config-entry-research-20261017.md](D:/DeepSeek/dsh-plugin-dev/docs/design-specs/config-entry-research-20261017.md)。

已确认的三代入口：

1. 文件约定：高级用户/自动化友好，但无发现性。
2. Client half + 注册设置卡：`configForms`、`SettingsForm`、`plugins.item`。
3. Host 从 Config schema 自动派生设置 UI。

共通 UX：

- staged draft
- save 才写入
- overridden 标签
- restore default
- 离开页面丢弃草稿
- 非法输入阻止保存并就地解释

## 4. 对本产品的约束

- 首选 `settings.section`。
- `settings.plugins.tab` 只做兼容/轻量入口，不作为完整治理产品唯一入口。
- Client 仅使用宿主 external；Host 逻辑不进入 Client bundle。
- 优先复用 typed remote/configForms；自有 API 才使用同源 fetch。
- 设计必须以 draft/publish/effective 分离为前提，即使当前实现仍未完成，也必须标“未实现”。
- 页面必须同时表达 loading、empty、error、busy、success、disabled、recovery。
- 使用 Theme Inspect 返回的宿主 token；不自建独立视觉主题。
- 当前 live Config absent、GUI 视觉未走查，均不得标成完成。
