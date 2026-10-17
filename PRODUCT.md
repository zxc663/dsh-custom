# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

首要用户是 DSH 插件/规则维护者：在设置中检查模型实际收到的 system prompt，编辑纪律前置与 complete 接管文本，管理工作区覆盖，并确认保存、回滚和冲突状态。

## Product Purpose

「DSH自定义」管理 DeepSeek Harness 的系统提示词来源、作用域和生效状态，让维护者能看见真实装配结果、进行可回滚的编辑，并避免静默改写。成功意味着维护者可以回答“当前模型实际看到什么、来自哪里、何时生效、如何恢复”。

## Positioning

它管理的是 system prompt 本体与其运行时装配证据，不是输入框提示词片段库，也不是模型请求改写器；页面以宿主 assemble/render 真值和版本快照为依据，而不是模型自述。

## Operating Context

页面运行于 DSH Web UI 的设置区域。内容来自插件自管存储 `$DSH_HOME/dsh-custom/`、宿主 `systemPrompt.assemble()` / `renderPrompt` 以及活动会话的作用域信息。系统提示词编辑会影响后续真实模型请求，保存前必须校验并生成快照；热生效发生在下一次真实组装，不主动向会话推送新 system 消息。

## Capabilities and Constraints

- 查看实际装配：渲染全文、分区源码、段级归属与字符数、全局或活动会话作用域。
- 完整保留并重组深度接管：complete 独占、干跑校验、未知变量阻止保存、快照、回滚、冲突检测。
- 完整保留并重组纪律前置：总开关、Markdown 编辑、前 8 行预览、全局默认、工作区覆盖、AGENTS.md 共存信息。
- 文件是权威层，页面是编辑面；写入前快照，外部改动需检测并留痕。
- 不做输入框草稿、云同步、会话日志改写或执法语义改造。
- 当前工作区本身没有自动化 UI 框架；现有 Client 是 plain JavaScript + React external。
- 当前运行时 Inspect 显示 `dsh-custom` Config status=absent，Client Slots 查询超时；历史文档/截图不等于当前 live 注册证据。

## Brand Commitments

名称：「DSH自定义 · 系统提示词管理」。语气中文优先、直接、可审计；保留 DSH 宿主主题与 token，不引入独立品牌皮肤。设计参考理念为 Shisan Xinuo Product：先产品对象、能力闭环、状态、证据，再定 UI。

## Evidence on Hand

- 设计冻结与分期契约：`D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md`。
- 现有页面实现：`client.js`；现有 P0–P2 运行时实现：`src/index.ts`。
- 当前实时 Host Service 证据：`systemPrompt.section/assemble` 正式存在；Config 目录中 `dsh-custom` 当前 absent；主题 token 已由 Client Theme Inspect 返回。
- GitHub 参考项目通过 API/raw 只读调研成功；普通 github 页面抓取因当前网络解析失败，未将网页抓取失败当作项目结论。

## Product Principles

1. 先看真实装配，再改内容。
2. 所有高影响操作都可解释、可回滚、可留痕。
3. 默认安全：深度接管默认关闭，冲突和未知变量阻止保存/启用。
4. 作用域和生效时机必须显式，不让用户猜测。
5. 页面元素必须回指一个能力和一条可验证证据。

## Accessibility & Inclusion

键盘可达、控件有可访问名称、焦点可见、错误靠近发生位置、色彩不作为唯一状态通道、尊重 reduced motion；实现阶段按 WCAG 可查子集和 DSH 宿主主题 token 验证。
