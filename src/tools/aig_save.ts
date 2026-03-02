import { git } from "../utils/git.js";
import type { Tool, CallToolResult } from "../types.js";

export const aigSave: Tool = {
  definition: {
    name: "aig_save",
    description:
      "在进行代码修改前，强制调用此工具进行 Git 碎片存档（Checkpoint）。",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "存档备注，简述接下来要修改的内容",
        },
      },
      required: ["message"],
    },
  },

  async handler(args): Promise<CallToolResult> {
    const { message } = args as { message: string };

    git("add", ".");

    // 空提交保护：暂存区无变更则跳过
    const staged = git("status", "--porcelain");
    if (!staged) {
      return {
        content: [
          {
            type: "text",
            text: "⚠️ 工作区无任何变更，跳过本次存档，请先修改代码再存档。",
          },
        ],
      };
    }

    const timestamp = new Date().toLocaleTimeString();
    const msg = `🤖 [AI Checkpoint] ${message} (${timestamp})`;
    git("commit", "-m", msg);

    return {
      content: [{ type: "text", text: `✅ 存档成功！记录: ${msg}` }],
    };
  },
};
