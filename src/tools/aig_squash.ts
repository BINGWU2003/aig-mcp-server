import type { CallToolResult, Tool } from '../types.js'
import { git } from '../utils/git.js'

export const aigSquash: Tool = {
  definition: {
    name: 'aig_squash',
    description:
      '当整个需求或一个阶段的任务全部完成后，调用此工具。它会自动识别并把之前产生的所有连续 AI Checkpoint 碎片提交，压缩合并成一个正式的、整洁的 Git 提交记录。建议先用 preview: true 预览，确认后再正式执行。',
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description:
            '高度概括本次完成的内容，格式建议：\'feat: 重构多租户拦截器并增加表单校验\'',
        },
        preview: {
          type: 'boolean',
          description:
            '是否仅预览将被合并的 Checkpoint 列表（不执行实际合并）。默认 false。建议先传 true 确认内容，再传 false 正式执行。',
        },
      },
      required: ['summary'],
    },
  },

  async handler(args): Promise<CallToolResult> {
    const { summary, preview = false } = args as {
      summary: string
      preview?: boolean
    }

    // 获取最近 100 条提交信息（含 hash 用于展示）
    const logOutput = git('log', '--format=%h|%s', '-n', '100')
    const lines = logOutput.split('\n').filter(Boolean)

    // 统计连续的 [AI Checkpoint] 数量
    let count = 0
    const checkpoints: string[] = []
    for (const line of lines) {
      const [hash, ...msgParts] = line.split('|')
      const msg = msgParts.join('|')
      if (msg.includes('[AI Checkpoint]')) {
        count++
        checkpoints.push(`  ${count}. ${hash} ${msg}`)
      }
      else {
        break
      }
    }

    if (count === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '⚠️ 没有找到连续的 AI Checkpoint，无需合并。当前 Git 历史已经很整洁了！',
          },
        ],
      }
    }

    // 预览模式：只展示将被合并的 Checkpoint，不执行
    if (preview) {
      const previewText = [
        `🔍 预览：以下 ${count} 个 AI Checkpoint 将被压缩合并为：`,
        `   "✨ ${summary}"`,
        '',
        ...checkpoints,
        '',
        '确认无误后，请以 preview: false 重新调用 aig_squash 执行合并。',
      ].join('\n')

      return {
        content: [{ type: 'text', text: previewText }],
      }
    }

    // 正式执行：软回滚，抹掉碎片 commit，保留代码变更
    git('reset', '--soft', `HEAD~${count}`)

    const finalMsg = `✨ ${summary}`
    git('commit', '-m', finalMsg)

    return {
      content: [
        {
          type: 'text',
          text:
            count === 1
              ? `🎉 已将 1 个 AI 存档重命名为正式提交：\n"${finalMsg}"`
              : `🎉 完美收官！已将 ${count} 个 AI 碎片存档压缩合并为 1 个正式提交：\n"${finalMsg}"`,
        },
      ],
    }
  },
}
