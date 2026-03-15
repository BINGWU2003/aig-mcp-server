# aig-mcp-server 项目面试文档

> 技术栈：Node.js · TypeScript · Model Context Protocol (MCP) · Git CLI

---

## 一、项目背景 & 解决的问题

### 背景

Claude Code、Cursor 等 AI 编程助手在执行复杂重构任务时，会连续修改多个文件，但它们本身没有版本记忆——一旦某步出错，只能手动 `git log` 找点、`git reset` 回滚，操作繁琐且容易覆盖未保存的工作区变更。

### 核心痛点

1. **无版本记忆**：AI 不知道自己改了什么、改了几步，出错后无法自主回到安全状态
2. **回滚成本高**：需要人工介入执行多条 Git 命令，中断了 AI 辅助编程的连续性
3. **碎片提交污染**：调试过程中产生大量 WIP 提交，污染 Git 历史

### 解决方案

基于 MCP 协议实现一套本地 Git 状态管理工具，将版本管理能力标准化暴露给 AI，使 AI Agent 具备自主执行「存档 → 回滚 → 压缩收尾」完整版本管理工作流的能力。

---

## 二、技术方案

### 整体架构

```
AI 编程助手（Claude Code / Cursor）
        │  MCP 协议（stdio）
        ▼
  aig-mcp-server
  ┌─────────────────────────────────────┐
  │  index.ts  — 路由 & 错误处理         │
  │  tools/                             │
  │    aig_status  — Git 状态快照        │
  │    aig_save    — 创建 Checkpoint     │
  │    aig_undo    — 回滚               │
  │    aig_squash  — 压缩碎片提交        │
  │  utils/git.ts  — 安全 Git 封装       │
  └─────────────────────────────────────┘
        │  execFileSync
        ▼
    本地 Git 仓库
```

### 传输层选型

使用 MCP 官方 SDK 的 **stdio 传输**，Server 以子进程形式运行，AI 宿主通过标准输入输出与之通信，无需网络端口，零运维成本，本地安全。

### 工具设计

| 工具 | 触发时机 | 核心操作 |
|------|---------|---------|
| `aig_status` | 任务开始前 | 返回分支、工作区变更、待合并 Checkpoint 数、最近提交 |
| `aig_save` | 每步修改前 | `git add .` + 空提交保护 + `git commit -m "🤖 [AI Checkpoint] ..."` |
| `aig_undo` | 出错回滚 | `git reset --hard HEAD~N`（N 为 steps，范围 1~20） |
| `aig_squash` | 任务完成 | 统计连续 Checkpoint → `reset --soft` + 一次性 `git commit` |

---

## 三、关键设计决策 & 亮点

### 1. Shell 注入防御

**问题：** 如果用字符串拼接执行 Git 命令（如 `exec('git commit -m ' + message)`），恶意 message 可注入任意 shell 指令。

**方案：** 统一封装 `git(...args: string[])` 工具函数，底层使用 `execFileSync('git', args)`，参数以数组形式传入，彻底绕过 shell 解析，消除注入面。

```typescript
// utils/git.ts
export function git(...args: string[]): string {
  return execFileSync('git', args, { stdio: 'pipe', encoding: 'utf-8' }).trim()
}
```

### 2. 空提交保护

**问题：** 如果工作区没有变更就执行 `aig_save`，会产生一个空提交，污染历史且无意义。

**方案：** `git add .` 后立即用 `git status --porcelain` 检查暂存区，为空则提前返回提示，跳过提交。

```typescript
git('add', '.')
const staged = git('status', '--porcelain')
if (!staged) {
  return { content: [{ type: 'text', text: '⚠️ 工作区无变更，跳过存档' }] }
}
```

### 3. 软回滚（reset --soft）压缩策略

**问题：** 直接 `git reset --hard` 会丢失代码变更；rebase 交互模式在 stdio 环境无法使用。

**方案：** `aig_squash` 使用 `reset --soft HEAD~N`，只撤销提交记录，代码变更全部保留在暂存区，再执行一次 `git commit` 即可得到一条整洁的正式提交。同时将 `git add .` 提前执行，确保未暂存的工作区变更也被一并纳入。

```
Before:  A ← B(checkpoint) ← C(checkpoint) ← D(checkpoint)
reset --soft HEAD~3
After:   A ← (B+C+D 代码全在暂存区)
commit:  A ← "✨ feat: 重构登录模块"
```

### 4. 连续 Checkpoint 识别

`aig_status` 和 `aig_squash` 都需要知道"有几个连续的 Checkpoint 待处理"。实现方式：

```typescript
const lines = git('log', '--format=%s', '-n', '100').split('\n')
let count = 0
for (const msg of lines) {
  if (msg.includes('[AI Checkpoint]')) count++
  else break  // 遇到第一条非 Checkpoint 提交立刻停止，只统计连续段
}
```

这保证了 `aig_squash` 不会误吞更早期的正式提交。

### 5. preview 模式防误操作

`aig_squash` 支持 `preview: true`，先展示将被合并的 Checkpoint 列表，让 AI（或用户）确认后再以 `preview: false` 正式执行，避免不可逆操作的意外触发。

---

## 四、核心工作流

```
用户：帮我把这个 Vue 组件拆成 3 个子组件，顺便加 TS 类型，收尾做个提交。

AI: aig_status()
    → 了解当前分支和 Git 状态

AI: aig_save("拆分 Vue 组件")
    → 📦 Checkpoint #1

    // ... 修改代码 ...

AI: aig_save("增加 TS 类型")
    → 📦 Checkpoint #2

    // ... 修改代码 ...

AI: aig_save("Tailwind 样式调整")
    → 📦 Checkpoint #3

    // 某步出错了
AI: aig_undo(steps=1)
    → ⏪ 回滚 #3，代码恢复到 #2 状态

    // 重新修改成功
AI: aig_save("Tailwind 样式调整（修复后）")
    → 📦 Checkpoint #3'

AI: aig_squash(summary="feat: 拆分 Vue 组件并增加 TS 类型", preview=true)
    → 🔍 预览：3 个 Checkpoint 将被合并

AI: aig_squash(summary="feat: 拆分 Vue 组件并增加 TS 类型", preview=false)
    → 🎉 3 个碎片 Checkpoint 压缩为 1 个正式提交
```

---

## 五、预期面试问题 & 回答思路

### Q1：为什么选 MCP 协议而不是直接写个脚本或 CLI？

MCP 是 AI 宿主与外部工具通信的标准协议，AI 可以自主决策何时调用哪个工具，无需人工触发。脚本/CLI 需要人介入，而 MCP 工具可以被 AI Agent 在对话中自动调用，这是核心区别——目标是让 AI 具备自主执行完整版本管理工作流的能力。

### Q2：`reset --soft` 和 `reset --hard` 的区别，为什么 squash 用 soft？

- `--hard`：HEAD 后移，暂存区和工作区全部重置，代码变更**丢失**
- `--soft`：HEAD 后移，暂存区和工作区**保持不变**，Checkpoint 提交的代码全部保留在暂存区

squash 的目的是"合并提交记录，保留代码"，所以必须用 `--soft`。而 `aig_undo` 的目的是"撤销这次改动"，需要丢弃代码，所以用 `--hard`。

### Q3：如果 AI 在 squash 前没有调用 save，有未提交的变更怎么办？

`aig_squash` 开头会执行 `git add .`，将所有未暂存变更加入暂存区，然后在 `reset --soft` 后一并提交。所以即使有未提交的变更，也会被安全纳入最终的正式提交里。preview 模式会明确展示这些未提交文件，提醒用户确认。

### Q4：连续 Checkpoint 识别算法为何要"遇到非 Checkpoint 立刻停止"？

因为用户的 Git 历史里可能有这样的结构：
```
旧的正式提交 A
旧的正式提交 B
🤖 [AI Checkpoint] 上次任务的残留
正式提交 C（已 squash 的）
🤖 [AI Checkpoint] 本次任务 #1
🤖 [AI Checkpoint] 本次任务 #2
```
如果不停止，会把"上次任务的残留"也误算进去，导致 squash 跨越正式提交 C，破坏历史。只统计最新的连续段，可以精确圈定本次任务产生的碎片。

### Q5：这个工具有什么局限性或可以改进的地方？

1. **分支感知缺失**：当前只操作 HEAD，如果 AI 在 detached HEAD 状态下运行会有问题
2. **并发安全**：多个 AI 实例同时操作同一仓库会竞争，目前没有锁机制
3. **`aig_undo` 限制**：只支持 `--hard` 回滚，如果用户工作区有未暂存的文件会被一起丢弃——可以考虑先 stash 再 reset
4. **远程同步**：squash 后不会自动 push，如果该分支已有远程追踪，后续 push 需要 force，容易引发误操作

### Q6：execFileSync 为什么比 exec 更安全？

`exec` 底层走 shell，字符串参数会被 shell 解析，可以用 `;`、`&&`、`$()`、反引号等注入任意命令。`execFileSync` 直接 fork 子进程执行可执行文件，参数数组原样传给 argv，不经过 shell 解析，彻底消除注入面。

---

## 六、项目价值总结

| 维度 | 说明 |
|------|------|
| 工程价值 | 将 AI 辅助编程从"智能但危险"变为"智能且可回滚"，降低了 AI 不可预期修改带来的回滚成本 |
| 技术深度 | 涉及 MCP 协议集成、Git 底层机制（soft/hard reset）、Shell 安全、进程通信 |
| 设计思维 | 防御性设计（空提交保护、preview 模式、注入防御）贯穿始终 |
| 独立完成 | 从需求分析、方案设计到编码实现、文档撰写全程独立完成 |
