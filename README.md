# aig-mcp-server

一个 MCP（Model Context Protocol）服务，让 AI 在修改代码前后自动进行 Git 存档与回滚，任务完成后一键将碎片提交压缩为整洁的正式记录。

## 工具说明

### `aig_save` — 碎片存档

在 AI 修改代码**前**强制创建 Git Checkpoint，保障每一步都可回溯。

| 参数      | 类型   | 必填 | 说明                             |
| --------- | ------ | ---- | -------------------------------- |
| `message` | string | ✅   | 存档备注，简述接下来要修改的内容 |

```
✅ 存档成功！记录: 🤖 [AI Checkpoint] 重构登录逻辑 (10:30:00)
```

---

### `aig_undo` — 一键回滚

代码修改失败或需要撤销时，回滚到上一个 Checkpoint。

```
⏪ 已完美回滚！刚才的修改已撤销。
```

---

### `aig_squash` — 压缩收尾 🌟

任务完成后，自动识别并统计连续的 AI Checkpoint 数量，执行 `git reset --soft` 将所有碎片提交压缩为一个正式的、整洁的 Git Commit，告别垃圾提交历史。

| 参数      | 类型   | 必填 | 说明                                       |
| --------- | ------ | ---- | ------------------------------------------ |
| `summary` | string | ✅   | 正式提交总结，如：`feat: 重构多租户拦截器` |

```
🎉 完美收官！已将 3 个 AI 碎片存档压缩合并为 1 个正式提交：
"✨ feat: 拆分 Vue 组件并增加 TS 类型与 Tailwind 样式"
```

---

## 安装配置

无需手动安装，使用 `npx` 直接运行：

```json
{
  "mcpServers": {
    "aig-mcp-server": {
      "command": "npx",
      "args": ["-y", "aig-mcp-server"]
    }
  }
}
```

> **前提条件：** 项目目录必须是 Git 仓库（已执行 `git init`）

---

## 让 AI 自动遵守完整工作流

只配置 MCP 还不够，AI 需要明确指令才会主动调用工具。在项目中放一个规则文件，AI 编辑器读取后会自动遵守三阶段工作流。

### 第一步：创建 AI 规则文件

根据你使用的编辑器，选择对应路径：

| 编辑器         | 文件路径                                 |
| -------------- | ---------------------------------------- |
| Claude Desktop | `CLAUDE.md`（项目根目录）                |
| Cursor         | `.cursor/rules/aig.mdc`                  |
| 通用           | `doc/agent-rules.md`（在系统提示中引用） |

### 第二步：粘贴以下规则内容

```markdown
# Agent 核心防腐与交付规则

当你为我开发功能或重构代码时，必须严格遵守以下 Git 工作流：

1. **碎步开发（开发中）：** 在开始每一个小步骤前，**主动调用 `aig_save`** 进行临时静默存档。
2. **安全撤销（报错时）：** 如果代码报错，或我让你回退，立即调用 `aig_undo`。
3. **打包交付（完成时）🌟：** 当所有任务完成，我说"没问题了"、"任务结束"或"可以提交了"时，你必须：
   - 回顾本轮产生的所有修改步骤。
   - 生成一段简明的正式提交总结（格式：`feat: 增加多租户登录表单验证`）。
   - **主动调用 `aig_squash`**，传入这句总结，将碎片存档压缩为一个整洁的正式提交。
```

---

## 🚀 完整工作流示例

```
你：帮我把这个 Vue 组件拆成 3 个子组件。
  → AI 调用 aig_save → 修改代码  (Git 多 1 个 Checkpoint)

你：顺便加一下 TS 类型定义。
  → AI 调用 aig_save → 修改代码  (Git 多 1 个 Checkpoint)

你：样式用 Tailwind 调一下。
  → AI 调用 aig_save → 修改代码  (Git 多 1 个 Checkpoint)

你：没问题，收尾吧。
  → AI 调用 aig_squash("feat: 拆分 Vue 组件并增加 TS 类型与 Tailwind 样式")
  → 3 个碎片 Checkpoint 瞬间压缩为 1 个整洁 Commit ✨
```

---

## 本地开发

```bash
pnpm install
pnpm dev      # watch 模式
pnpm build    # 构建 → dist/index.js
```

## License

ISC
