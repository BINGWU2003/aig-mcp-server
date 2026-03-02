import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";

// 初始化 MCP Server
const server = new Server(
  { name: "aig-mcp-server", version: "1.0.2" },
  { capabilities: { tools: {} } },
);

const runSync = (cmd: string): string =>
  execSync(cmd, { stdio: "pipe", encoding: "utf-8" });

// 1. 注册工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "aig_save",
        description: "在进行代码修改前，强制调用此工具进行 Git 存档。",
        inputSchema: {
          type: "object" as const,
          properties: {
            message: {
              type: "string",
              description: "存档备注，简述接下来要修改的内容",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "aig_undo",
        description:
          "代码修改失败、报错，或用户要求撤销时，调用此工具将代码回滚。",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
    ],
  };
});

// 2. 执行工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "aig_save") {
      const message = (args as { message: string }).message;
      runSync("git add .");
      const timestamp = new Date().toLocaleTimeString();
      const msg = `🤖 [AI Checkpoint] ${message} (${timestamp})`;
      runSync(`git commit -m "${msg}"`);
      return {
        content: [{ type: "text", text: `✅ 存档成功！记录: ${msg}` }],
      };
    }

    if (name === "aig_undo") {
      runSync("git reset --hard HEAD~1");
      return {
        content: [{ type: "text", text: "⏪ 已完美回滚！刚才的修改已撤销。" }],
      };
    }

    throw new Error("未知的工具调用");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `❌ 失败: ${errMsg}` }],
      isError: true,
    };
  }
});

// 3. 启动 Server
const transport = new StdioServerTransport();
await server.connect(transport);
