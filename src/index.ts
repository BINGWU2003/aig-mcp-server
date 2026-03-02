import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { assertGitRepo } from "./utils/git.js";
import { aigSave } from "./tools/aig_save.js";
import { aigUndo } from "./tools/aig_undo.js";
import { aigSquash } from "./tools/aig_squash.js";
import { aigStatus } from "./tools/aig_status.js";
import type { Tool } from "./types.js";

// 注册所有工具
const tools: Tool[] = [aigStatus, aigSave, aigUndo, aigSquash];
const toolMap = new Map(tools.map((t) => [t.definition.name, t]));

const server = new Server(
  { name: "aig-mcp-server", version: "1.2.0" },
  { capabilities: { tools: {} } },
);

// 列举工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => t.definition),
}));

// 路由工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    assertGitRepo();

    const tool = toolMap.get(name);
    if (!tool) throw new Error(`未知的工具调用: ${name}`);

    return await tool.handler((args ?? {}) as Record<string, unknown>);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `❌ 失败: ${errMsg}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
