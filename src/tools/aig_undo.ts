import type { CallToolResult, Tool } from '../types.js'
import { git } from '../utils/git.js'

export const aigUndo: Tool = {
  definition: {
    name: 'aig_undo',
    description:
      '代码修改失败、报错，或用户要求撤销时，调用此工具将代码回滚。支持多步回滚。',
    inputSchema: {
      type: 'object',
      properties: {
        steps: {
          type: 'number',
          description:
            '回滚步数，默认为 1（撤销最近一次修改），填 2 则撤销最近两次，以此类推',
        },
      },
    },
  },

  async handler(args): Promise<CallToolResult> {
    const { steps = 1 } = args as { steps?: number }

    if (!Number.isInteger(steps) || steps < 1 || steps > 20) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ steps 参数无效，请传入 1~20 之间的整数。',
          },
        ],
        isError: true,
      }
    }

    git('reset', '--hard', `HEAD~${steps}`)

    return {
      content: [
        {
          type: 'text',
          text: `⏪ 已回滚 ${steps} 步！所有相关修改已撤销。`,
        },
      ],
    }
  },
}
