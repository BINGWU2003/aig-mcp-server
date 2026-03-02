import { git } from "../utils/git.js";
import type { Tool, CallToolResult } from "../types.js";

export const aigStatus: Tool = {
  definition: {
    name: "aig_status",
    description:
      "查看当前 Git 状态快照：分支、工作区变更、待合并的 AI Checkpoint 数量及最近提交记录。在执行 aig_save / aig_squash 前调用，可帮助 AI 了解当前状态。",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  async handler(): Promise<CallToolResult> {
    // 当前分支
    const branch = git("rev-parse", "--abbrev-ref", "HEAD");

    // 工作区状态
    const statusRaw = git("status", "--porcelain");
    const changedFiles = statusRaw ? statusRaw.split("\n").filter(Boolean) : [];
    const workingTreeStatus =
      changedFiles.length === 0
        ? "✅ 工作区干净，无未提交变更"
        : `⚠️ 有 ${changedFiles.length} 个文件未提交：\n${changedFiles.map((f) => `  ${f}`).join("\n")}`;

    // 统计连续 AI Checkpoint 数量
    const logOutput = git("log", "--format=%s", "-n", "100");
    const lines = logOutput.split("\n").filter(Boolean);
    let checkpointCount = 0;
    for (const msg of lines) {
      if (msg.includes("[AI Checkpoint]")) checkpointCount++;
      else break;
    }

    const checkpointStatus =
      checkpointCount === 0
        ? "✅ 无待合并的 AI Checkpoint"
        : `📦 有 ${checkpointCount} 个连续 AI Checkpoint 待合并（可调用 aig_squash 压缩）`;

    // 最近 5 条提交
    const recentLog = git("log", "--format=%h %s", "-n", "5");
    const recentCommits = recentLog
      .split("\n")
      .filter(Boolean)
      .map((line, i) => `  ${i + 1}. ${line}`)
      .join("\n");

    const report = [
      `🌿 当前分支：${branch}`,
      "",
      workingTreeStatus,
      "",
      checkpointStatus,
      "",
      "📋 最近提交记录：",
      recentCommits || "  （暂无提交）",
    ].join("\n");

    return {
      content: [{ type: "text", text: report }],
    };
  },
};
