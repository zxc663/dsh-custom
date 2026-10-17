# DSH 自定义 · 系统提示词管理｜产品重构 v2

> 状态：重新设计中｜上一版原型作废
> 本稿不是当前页面改版稿，而是从完整产品能力反推的未来产品契约。
> 设计确认前不修改 `client.js` / `src/index.ts`。

## 1. 产品主对象

**目标上下文下的有效系统提示词配置版本。**

不是“官方提示词页”、不是“纪律文本页”、也不是“complete 编辑器”。这些都是 Prompt Source 或发布策略。

### 主闭环

```text
选择目标上下文
→ 查看当前有效配置
→ 创建草案
→ 编辑来源与策略
→ 差异 / 影响预测
→ 目标级预检
→ 发布
→ 下一次真实组装取证
→ 继续观察 / 回滚
```

## 2. 能力状态标记

| 能力 | 状态 | 证据/缺口 |
|---|---|---|
| Host `systemPrompt.section/assemble` | 已实现｜运行时契约已确认 | Host Inspect 直接证据 |
| 纪律前置、总开关、作用域覆盖 | 仓库/历史实证已实现；当前 profile 未复验 | `src/index.ts`、历史 132/132；当前 Config 为 absent |
| complete 接管、变量预检、冲突拒绝 | 仓库/历史实证已实现；当前 profile 未复验 | 历史交接与测试记录；需 live 复验 |
| 当前有效配置查看 | 部分实现 | 当前有 assembly 读取；缺统一版本对象与目标上下文模型 |
| Profile / 工作区 / 会话 / Agent / 运行档位目标选择 | 部分实现/规划中 | 会话有历史端点；Profile 与运行档位未统一建模 |
| 草案 Draft | 未实现 | 现有保存直接落盘，缺 draft 生命周期 |
| 校验后发布 Publish | 未实现 | 现有保存与生效混合，需新增发布数据面 |
| 有效/已发布/已生效版本 | 未实现 | 需要版本对象、状态和证据关联 |
| 影响预测 | 未实现 | 需要模拟 assemble、source diff、冲突解释 |
| 发布后真实运行证据 | 未实现 | 当前 assembly 读取不等于发布关联的 runtime evidence |
| 段级来源链与继承解释 | 未实现 | 当前有 origin badge，但缺来源链/遮蔽原因 |
| 审计与哈希基础 | 部分实现 | audit/hash/status 已有；缺查询、筛选、关联发布 |
| 回滚基础 | 仓库/历史实证已实现 | UI 需改为版本对象恢复，不是文件列表回滚 |
| 导入/导出与迁移冲突 | 规划中 | P3 方向，需 schema/version/冲突预览 |
| 权限/审核/组织分发 | 规划中 | 当前本地单用户，不伪装已存在 |
| 健康中心与兼容矩阵 | 规划中 | 需独立运营面 |

## 3. 目标上下文模型

统一选择器必须回答：**我正在查看哪个有效 prompt？**

```text
TargetContext {
  profile: current | named profile | unavailable
  workspace: global | workspace path
  session: none | active session
  agent: none | active agent scope
  runMode: known mode | unknown
}
```

优先级必须可解释：

```text
Profile default
  → Global source
    → Workspace override
      → Session / Agent override
        → Run-time context
```

每个有效值都必须能显示：来源、覆盖谁、为什么命中、未命中时回退到哪里。

## 4. Prompt Source 模型

| Source 类型 | 可编辑 | 默认状态 | 目标 |
|---|---:|---|---|
| Official Host | 否 | 生效 | 显示宿主官方来源与版本 |
| Plugin source | 取决于插件 | 生效/禁用 | 显示插件包、段名、顺序 |
| Discipline | 是 | 开启 | system 前置，独立开关 |
| AGENTS.md | 不由本产品编辑 | 宿主来源 | 只读发现、重复/优先级提示 |
| Persona / external | 取决于来源 | 外部决定 | 冲突、遮蔽和来源链 |
| Complete override | 是 | 默认关闭 | 发布策略，不是普通 source |

## 5. 生命周期模型

```text
draft
  → validating
    → validated
      → publish-review
        → publishing
          → published
            → awaiting-runtime
              → effective
                → superseded
                → rolled-back

任何校验/发布失败：保留旧 effective，草案进入 invalid 或回到 draft。
```

关键语义：

- 保存草案 ≠ 发布
- 发布成功 ≠ 已被下一次模型请求使用
- 页面刷新 ≠ 生效证据
- `effective` 只能由目标上下文的真实 assembly/runtime evidence 证明
- 回滚前先快照当前版本；回滚后重新预检并等待真实证据

## 6. 顶层信息架构

不按 discipline / override / official 三个文件分区。

```text
系统提示词管理
├─ 当前有效配置
│  ├─ 目标上下文
│  ├─ 当前有效版本
│  ├─ 有效 prompt
│  ├─ 来源链 / 继承 / 遮蔽解释
│  ├─ 运行时证据
│  └─ 创建草案
├─ 草案与变更
│  ├─ 草案列表
│  ├─ 编辑工作区
│  ├─ Source Tree
│  ├─ Diff
│  ├─ 影响预测
│  ├─ 预检结果
│  └─ 提交发布
├─ 发布与版本
│  ├─ 待发布
│  ├─ 已发布
│  ├─ 已生效
│  ├─ 历史版本
│  ├─ 版本详情 / Diff
│  └─ 回滚
├─ 作用域与来源
│  ├─ Profile / Global / Workspace / Session
│  ├─ Source Registry
│  ├─ 优先级与遮蔽
│  ├─ AGENTS 共存
│  └─ 冲突策略
├─ 健康与审计
│  ├─ 冲突
│  ├─ 变量缺失
│  ├─ 渲染降级
│  ├─ 外部改动
│  ├─ 护栏事件
│  └─ 发布→生效证据链
└─ 设置与迁移
   ├─ 默认行为
   ├─ 快照保留
   ├─ 导入 / 导出
   ├─ 迁移预览
   ├─ 恢复官方默认
   └─ 宿主兼容性
```

## 7. 新原型页面规格

### 7.1 当前有效配置：默认首页

首屏不是大段 prompt 文本，而是**目标与版本判断**：

1. 顶部目标条：`Profile / Workspace / Session / Run mode`
2. 健康结论：`已生效 / 待取证 / 有冲突 / 降级 / 无配置`
3. 当前版本卡：版本名、来源、发布时间、发布者、目标上下文、hash
4. 来源链：每个 source 显示继承、覆盖、关闭、回退关系
5. 有效 prompt 检查器：渲染/源码/来源三种视图
6. 运行时证据：发布事件、下一次真实组装、system/message 证据；无证据明确显示“尚未证明生效”
7. 主动作：`从当前有效配置创建草案`

### 7.2 草案与变更：编辑工作区

左侧是 Source Tree，不是文件分区：

```text
当前草案
├─ Official Host [只读]
├─ Discipline [可编辑]
├─ Persona / external [外部]
├─ AGENTS.md [只读]
└─ Complete strategy [高风险]
```

中央为编辑与 diff，右侧为影响预测：

- 将新增哪些 source
- 将移除/遮蔽哪些 source
- 哪些目标上下文受影响
- 是否触发 complete 独占
- 哪些变量只能在请求期解析
- 是否会破坏已有有效版本

底部固定工作流：`保存草案` → `运行预检` → `进入发布复核`。

### 7.3 发布复核

发布不是 toast，而是独立确认面：

```text
目标：workspace / session / run mode
变更：3 个 source，1 个顺序调整，1 个开关
风险：complete 独占；会遮蔽 persona-prefix
预检：通过 7 / 失败 0 / 警告 2
回退：自动创建版本 v12
生效边界：下一次真实模型组装
证据状态：发布后待取证
```

主动作：`发布此草案`。高风险动作需要明确确认；未实现审批以“规划中”标记，不绘制假审批流程。

### 7.4 发布与版本

列表以版本为主对象：

- `draft`、`validated`、`published`、`effective`、`superseded`、`rolled-back`、`invalid`
- 当前有效版本固定置顶
- 发布版本与运行证据关联
- 回滚按钮显示“回滚到此版本”，不显示底层文件名
- 版本详情包含 source diff、目标上下文、发布者、时间、hash、证据状态

### 7.5 健康与审计

不是底部状态文本，而是可操作的运营面：

| 健康项 | 结果 | 出路 |
|---|---|---|
| Complete 冲突 | 未实现/已检测 | 查看冲突来源、停用接管 |
| 未知变量 | 阻断 | 返回草案定位变量 |
| 外部改动 | 警告 | 重新读取、比较、保留旧版本 |
| 渲染降级 | 警告 | 查看原文、重试宿主渲染 |
| 发布未取证 | 待处理 | 打开目标会话、等待真实 assembly |
| 宿主兼容性 | 规划中 | 查看兼容矩阵 |

## 8. DSH UI 实现约束（真实证据）

当前已确认的 live Slot：

- `settings.section`：完整设置页入口；当前 occupant 中有 `dsh-custom`，order 30；owner props 提供 `close()`。
- `settings.plugins.tab`：插件设置页内部 Tab；当前 occupant 有 `all`；props 为空。

生态源码范式：

- `dsh-our-free-model`：`ModuleLoader` + React external + `settings.section`；同源 API、AbortController、loading/error/retry、状态徽标。
- `dsh-permission-rules`：`settings.section` + typed remote bridge；编辑、reload、错误状态和阻断计数。
- 官方 `dsh-client-ui-settings-agent-loop`：`configForms` + `SettingsForm`；staged edit/save/discard/reset/invalid；通过 `plugins.item` 卡片挂载。
- 官方 `dsh-client-ui-settings-models`：typed remote + configForms/store；复杂 provider card、busy/failure、动态刷新。

因此实现前契约：

1. 首选 `settings.section` 承载完整管理产品；`settings.plugins.tab` 仅作为兼容入口或轻量插件卡片，不承载主治理工作流。
2. Client 只依赖宿主 external；不要把 Host Node 代码直接带入 Client。
3. 有宿主 typed remote/configForms 时优先复用；自有 API 才使用同源 fetch。
4. 所有编辑采用 staged draft；禁止输入变化直接写文件。
5. 必须实现 loading / empty / error / busy / success / disabled / recovery。
6. 使用宿主 `--dsw-*` token；不得用独立背景体系或硬编码主题色。
7. 入口、占位、owner props 在实现前以当前 live Inspect 再核验；历史证据不替代实机 GUI。

## 9. 页面功能与实现状态追溯

| 页面行为 | 产品能力 | 当前状态 | 需要新增 |
|---|---|---|---|
| 选择 Profile/工作区/会话/档位 | Target Context | 部分实现 | 统一 target resolver + 运行档位来源 |
| 查看有效版本 | Effective Config | 部分实现 | version/effective 对象 |
| 创建草案 | Draft | 未实现 | draft 存储/命名/放弃/恢复 |
| 编辑 source | Source Registry | 部分实现 | source tree 与段级编辑契约 |
| Diff | Change Review | 未实现 | 结构 diff + 文本 diff |
| 影响预测 | Impact Preview | 未实现 | dry-run assemble + source impact |
| 预检 | Validation | 部分实现 | 目标级完整预检 |
| 发布 | Publish | 未实现 | 原子写、发布事件、目标绑定 |
| 真实生效 | Runtime Evidence | 未实现 | 发布与 assembly/runtime 关联 |
| 回滚 | Restore | 部分实现 | 版本对象化、回滚后重新取证 |
| 导入/导出 | Migration | 规划中 | schema/version/conflict preview |
| 审计检索 | Audit Operations | 部分实现 | 查询、筛选、发布关联 |
| 审核/权限 | Governance | 规划中 | 宿主权限依赖，不画假流程 |
| 健康中心 | Operations | 规划中 | checks、兼容矩阵、恢复动作 |

## 10. 反上一版的明确裁决

- **废弃**“区一/区二/区三”：它是施工分期，不是用户信息架构。
- **废弃**“Prompt Observatory”作为主产品隐喻：装配检查只能是当前有效配置中的一个视图。
- **废弃**把保存当成生效：保存草案、发布配置、实际生效必须分离。
- **废弃**把来源类型当顶层页面：官方、纪律、AGENTS、外部、complete 都归入 Source/Strategy。
- **废弃**只显示生成时间：没有发布关联的 runtime evidence，就只能标“未证明生效”。
