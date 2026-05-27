import type { Tool, ToolDefinition } from './types.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { aigSave } from './tools/aig_save.js'
import { aigSquash } from './tools/aig_squash.js'
import { aigStatus } from './tools/aig_status.js'
import { aigUndo } from './tools/aig_undo.js'
import { assertGitRepo, resolveWorkspacePath } from './utils/git.js'

// 注册所有工具
const tools: Tool[] = [aigStatus, aigSave, aigUndo, aigSquash]

const server = new McpServer(
  { name: 'aig-mcp-server', version: '1.4.1' },
  { capabilities: { tools: {} } },
)

interface JsonSchemaProperty {
  type?: unknown
  description?: unknown
}

function propertyToZod(property: unknown): z.ZodType {
  const { type, description } = (property ?? {}) as JsonSchemaProperty

  let schema: z.ZodType
  switch (type) {
    case 'boolean':
      schema = z.boolean()
      break
    case 'number':
      schema = z.number()
      break
    case 'string':
    default:
      schema = z.string()
      break
  }

  return typeof description === 'string' ? schema.describe(description) : schema
}

function createInputSchema(definition: ToolDefinition): Record<string, z.ZodType> {
  const { properties, required = [] } = definition.inputSchema
  const requiredFields = new Set(required)
  const shape: Record<string, z.ZodType> = {}

  for (const [name, property] of Object.entries(properties)) {
    const schema = propertyToZod(property)
    shape[name] = requiredFields.has(name) ? schema : schema.optional()
  }

  return shape
}

for (const tool of tools) {
  const { definition } = tool
  server.registerTool(
    definition.name,
    {
      description: definition.description,
      inputSchema: createInputSchema(definition),
    },
    async (args) => {
      try {
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
    },
  )
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main()
