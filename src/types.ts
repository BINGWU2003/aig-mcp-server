import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type { CallToolResult };

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface Tool {
  definition: ToolDefinition;
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}
