import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";

// 初始化 MCP Server
const server = new Server(
  { name: "aig-mcp-server", version: "1.1.0" },
  { capabilities: { tools: {} } },
);

const runSync = (cmd: string): string =>
  execSync(cmd, { stdio: "pipe", encoding: "utf-8" }).trim();

// 1. 注册工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "aig_save",
        description:
          "在进行代码修改前，强制调用此工具进行 Git 碎片存档（Checkpoint）。",
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
          "代码修改失败、报错，或用户要求撤销时，调用此工具将代码回滚到上一个存档。",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "aig_squash",
        description:
          "当整个需求或一个阶段的任务全部完成后，调用此工具。它会自动识别并把之前产生的所有连续 AI Checkpoint 碎片提交，压缩合并成一个正式的、整洁的 Git 提交记录。",
        inputSchema: {
          type: "object" as const,
          properties: {
            summary: {
              type: "string",
              description:
                "高度概括本次完成的内容，格式建议：'feat: 重构多租户拦截器并增加表单校验'",
            },
          },
          required: ["summary"],
        },
      },
    ],
  };
});

// 2. 执行工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // --- aig_save ---
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

    // --- aig_undo ---
    if (name === "aig_undo") {
      runSync("git reset --hard HEAD~1");
      return {
        content: [{ type: "text", text: "⏪ 已完美回滚！刚才的修改已撤销。" }],
      };
    }

    // --- aig_squash ---
    if (name === "aig_squash") {
      const { summary } = args as { summary: string };

      // 1. 获取最近 100 条提交信息
      const logOutput = runSync("git log --format=%s -n 100");
      const lines = logOutput.split("\n").filter(Boolean);

      // 2. 统计从最新提交开始，连续的 [AI Checkpoint] 数量
      let count = 0;
      for (const msg of lines) {
        if (msg.includes("[AI Checkpoint]")) {
          count++;
        } else {
          break; // 遇到第一个非 Checkpoint 提交立即停止
        }
      }

      if (count === 0) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️ 没有找到连续的 AI Checkpoint，无需合并。当前 Git 历史已经很整洁了！",
            },
          ],
        };
      }

      if (count === 1) {
        // 只有一个碎片提交，直接重命名更优雅
        runSync("git reset --soft HEAD~1");
        const finalMsg = `✨ ${summary}`;
        runSync(`git commit -m "${finalMsg}"`);
        return {
          content: [
            {
              type: "text",
              text: `🎉 已将 1 个 AI 存档重命名为正式提交：\n"${finalMsg}"`,
            },
          ],
        };
      }

      // 3. 软回滚：抹掉所有碎片 commit，但保留所有代码变更在暂存区
      runSync(`git reset --soft HEAD~${count}`);

      // 4. 用 AI 生成的总结创建一个干净的正式提交
      const finalMsg = `✨ ${summary}`;
      runSync(`git commit -m "${finalMsg}"`);

      return {
        content: [
          {
            type: "text",
            text: `🎉 完美收官！已将 ${count} 个 AI 碎片存档压缩合并为 1 个正式提交：\n"${finalMsg}"`,
          },
        ],
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
