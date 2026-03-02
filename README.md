# aig-mcp-server

一个 MCP（Model Context Protocol）服务，让 AI 在修改代码前后自动进行 Git 存档与回滚，守护你的每一次代码变更。

## 功能

- `aig_save` — 在 AI 修改代码**前**强制存档，创建 Git checkpoint
- `aig_undo` — 代码修改失败或需要撤销时，一键回滚到上一个 checkpoint

## 安装使用

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

> **前提条件：** 项目目录必须是一个 Git 仓库（已执行 `git init`）

## 工具说明

### `aig_save`

在进行代码修改前，AI 会强制调用此工具进行 Git 存档。

| 参数      | 类型   | 必填 | 说明                             |
| --------- | ------ | ---- | -------------------------------- |
| `message` | string | ✅   | 存档备注，简述接下来要修改的内容 |

**示例输出：**

```
✅ 存档成功！记录: 🤖 [AI Checkpoint] 重构登录逻辑 (10:30:00)
```

### `aig_undo`

代码修改失败、报错，或用户要求撤销时，回滚到上一个 checkpoint。

**示例输出：**

```
⏪ 已完美回滚！刚才的修改已撤销。
```

## 让 AI 自动遵守存档规则

只靠配置 MCP 还不够，AI 需要明确的指令才会主动调用 `aig_save`。推荐在项目根目录创建一个 Markdown 文档，让 AI 编辑器（Claude、Cursor 等）在读取项目上下文时自动遵守存档流程。

### 第一步：在项目中创建 AI 规则文件

根据你使用的编辑器，选择对应的文件路径：

| 编辑器         | 文件路径                                 |
| -------------- | ---------------------------------------- |
| Claude Desktop | `CLAUDE.md`（项目根目录）                |
| Cursor         | `.cursor/rules/aig.mdc`                  |
| 通用           | `doc/agent-rules.md`（在系统提示中引用） |

### 第二步：将以下内容粘贴到文件中

```markdown
# Agent 核心防腐规则

当你接到修改代码的需求时，必须严格遵守以下流程：

1. 分析完需求后，在你修改任何文件之前，**必须主动调用 `aig_save` 进行静默存档**。
2. 存档成功后，再开始执行代码修改。
3. 如果我审查后告诉你"跑崩了"、"报错了"或者要求你撤销，请立即调用 `aig_undo` 恢复现场。
```

这样 AI 每次修改代码前都会自动存档，出错时你只需说"撤销"即可恢复。

## 适用场景

在 Claude、Cursor、Windsurf 等 AI 编程工具中配置此 MCP Server，AI 会在每次修改代码前自动创建 Git 存档点，出现问题时可以一键还原，无需担心 AI 写坏代码。

## 本地开发

```bash
# 克隆项目
git clone https://github.com/your-name/aig-mcp-server.git
cd aig-mcp-server

# 安装依赖
pnpm install

# 开发模式（watch）
pnpm dev

# 构建
pnpm build
```

## License

ISC
