# aig-mcp-server

> **让 AI 编程助手在修改代码时，像专业工程师一样管理 Git 记录。**

配置此 MCP Server 后，AI 会在每次修改代码前自动存档，出错时一键回滚，任务完成后将碎片提交压缩为整洁的正式记录。

## 工具一览

| 工具         | 时机       | 作用                                    |
| ------------ | ---------- | --------------------------------------- |
| `aig_status` | 任意时刻   | 查看当前 Git 状态快照                   |
| `aig_save`   | 每次修改前 | 创建 Git Checkpoint                     |
| `aig_undo`   | 修改报错时 | 回滚到上一个 Checkpoint                 |
| `aig_squash` | 任务完成时 | 将碎片 Checkpoint 压缩为一个正式 Commit |

---

## 工具详情

### `aig_status` — 状态快照

在操作前调用，帮助 AI 了解当前 Git 状态，避免盲目操作。

**返回内容：** 当前分支、未提交文件列表、待合并 Checkpoint 数量、最近 5 条提交记录。

---

### `aig_save` — 碎片存档

在每一步修改代码**前**调用，创建可回溯的 Checkpoint。

| 参数      | 类型   | 必填 | 说明                   |
| --------- | ------ | ---- | ---------------------- |
| `message` | string | ✅   | 简述接下来要修改的内容 |

```
✅ 存档成功！记录: 🤖 [AI Checkpoint] 重构登录逻辑 (10:30:00)
⚠️ 工作区无任何变更，跳过本次存档。   ← 空提交保护
```

---

### `aig_undo` — 回滚

代码修改失败或需要撤销时调用，支持多步回滚。

| 参数    | 类型   | 必填 | 说明                      |
| ------- | ------ | ---- | ------------------------- |
| `steps` | number | ❌   | 回滚步数，默认 1，最大 20 |

```
⏪ 已回滚 2 步！所有相关修改已撤销。
```

---

### `aig_squash` — 压缩收尾

任务完成后调用，自动统计连续 AI Checkpoint 数量并软回滚压缩为一条整洁的正式 Commit。

**建议先用 `preview: true` 确认，再正式执行。**

| 参数      | 类型    | 必填 | 说明                                   |
| --------- | ------- | ---- | -------------------------------------- |
| `summary` | string  | ✅   | 正式提交总结，如：`feat: 重构登录模块` |
| `preview` | boolean | ❌   | `true` 仅预览不执行，默认 `false`      |

```
# preview: true
🔍 预览：以下 3 个 AI Checkpoint 将被压缩合并为：
   "✨ feat: 拆分 Vue 组件并增加 TS 类型"
  1. a1b2c3d 🤖 [AI Checkpoint] 拆分组件
  2. d4e5f6a 🤖 [AI Checkpoint] 增加 TS 类型
  3. 7g8h9i0 🤖 [AI Checkpoint] 调整样式

# preview: false（正式执行）
🎉 完美收官！已将 3 个 AI 碎片存档压缩合并为 1 个正式提交：
"✨ feat: 拆分 Vue 组件并增加 TS 类型"
```

---

## 安装配置

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

## 让 AI 自动遵守工作流

在项目中创建规则文件，AI 编辑器读取后会自动遵守 3 阶段工作流。

**文件路径（按编辑器选择）：**

- Claude Desktop → `CLAUDE.md`
- Cursor → `.cursor/rules/aig.mdc`

**文件内容：**

```markdown
# Agent 核心防腐与交付规则

当你为我开发功能或重构代码时，必须严格遵守以下 Git 工作流：

1. **开始任务前：** 调用 `aig_status` 了解当前状态。
2. **每步修改前：** 主动调用 `aig_save` 进行临时存档。
3. **代码报错时：** 立即调用 `aig_undo` 回滚。
4. **任务完成时：** 先调用 `aig_squash(preview:true)` 预览，确认后再调用 `aig_squash(preview:false)` 压缩提交。
```

---

## 完整工作流示例

```
你：帮我把这个 Vue 组件拆成 3 个子组件。
  → AI: aig_status（了解现状）
  → AI: aig_save("拆分组件") → 修改代码

你：顺便加一下 TS 类型。
  → AI: aig_save("增加 TS 类型") → 修改代码

你：样式用 Tailwind 调一下。
  → AI: aig_save("调整样式") → 修改代码

你：没问题，收尾吧。
  → AI: aig_squash(summary="feat: 拆分组件并增加 TS 类型", preview=true)
  ← AI 展示预览，等你确认
  → AI: aig_squash(summary="feat: 拆分组件并增加 TS 类型", preview=false)
  ← 3 个碎片 Checkpoint 压缩为 1 个整洁 Commit ✨
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
