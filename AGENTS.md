# AGENTS.md — dsh-custom 项目规则（本仓原生通道）

## 项目本质
DSH「系统提示词管理」插件。设计档＝唯一契约：
`D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md`（修订以此为准）。

## 开工必读
- `memory/agent-log.md` 状态段（本机、不入库）。
- 设计档「拍板记录」段：语义 b / P0 范围 / 默认值，不重复发明。

## 纪律要点（与主仓一致的最小集）
- 每轮首产物＝复述（收到 X｜理解为 Y｜边界 Z）；改判级先问。
- L3 停点＝密钥/删除/迁移/发布/架构/超预算 → 先问再动。
- 不假实现：未完成/未验证显式标注；错误不许空 catch。
- 临时挂载必须登记「撤除条件 / 撤除动作 / 撤除后复验判据」三件。
- 提交 scoped 单令牌（禁 `+`）；推送后核对远端。
- 用户留存文档中文为主；标识符/术语除外。

## 关键路径
- 存储：`$DSH_HOME/dsh-custom/`（`DSH_HOME` 未设时 `~/.dsh`）。
- 钩子：`ctx.on('tools/pre-execute', (exec, next) => …)`；deny 形态 `{kind:'deny', reason}`。
- 宿主装配：`ctx.systemPrompt.assemble()`；渲染 `renderPrompt`（`@deepseek-ai/dsh-system-prompt`，动态导入、不可用即降级）。
- 运行时零宿主硬依赖（无 peer 声明）；type-only / 动态导入例外已注明。

## 验证命令
```powershell
npm run build; if ($?) { npm test }
```
