import type { Tool } from './types.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { aigSave } from './tools/aig_save.js'
import { aigSquash } from './tools/aig_squash.js'
import { aigStatus } from './tools/aig_status.js'
import { aigUndo } from './tools/aig_undo.js'
import { assertGitRepo, resolveWorkspacePath } from './utils/git.js'

// 注册所有工具
const tools: Tool[] = [aigStatus, aigSave, aigUndo, aigSquash]
const toolMap = new Map(tools.map(t => [t.definition.name, t]))

const server = new Server(
  { name: 'aig-mcp-server', version: '1.3.0' },
  { capabilities: { tools: {} } },
)

// 列举工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => t.definition),
}))

// 路由工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    const tool = toolMap.get(name)
    if (!tool)
      throw new Error(`未知的工具调用: ${name}`)

    const toolArgs = (args ?? {}) as Record<string, unknown>
    const workspacePath = resolveWorkspacePath(toolArgs)
    assertGitRepo(workspacePath)

    return await tool.handler(toolArgs)
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    return {
      content: [{ type: 'text' as const, text: `❌ 失败: ${errMsg}` }],
      isError: true,
    }
  }
})

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main()
