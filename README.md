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
