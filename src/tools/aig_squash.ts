import type { CallToolResult, Tool } from '../types.js'
import { git } from '../utils/git.js'

export const aigSquash: Tool = {
  definition: {
    name: 'aig_squash',
    description:
      '当整个需求或一个阶段的任务全部完成后，调用此工具。它会自动识别并把之前产生的所有连续 AI Checkpoint 碎片提交，以及当前工作区未提交的变更，一起压缩合并成一个正式的、整洁的 Git 提交记录。建议先用 preview: true 预览，确认后再正式执行。',
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

    // 检查工作区是否有未提交的变更
    git('add', '.')
    const uncommitted = git('status', '--porcelain')
    const hasUncommitted = uncommitted.length > 0
    const uncommittedFiles = hasUncommitted
      ? uncommitted.split('\n').filter(Boolean)
      : []

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

    // 既无 Checkpoint 也无未提交变更
    if (count === 0 && !hasUncommitted) {
      return {
        content: [
          {
            type: 'text',
            text: '⚠️ 没有找到 AI Checkpoint，工作区也无未提交变更。当前 Git 历史已经很整洁了！',
          },
        ],
      }
    }

    // 预览模式：展示将被合并的内容，不执行
    if (preview) {
      const previewLines: string[] = [
        `🔍 预览：以下内容将被压缩合并为：`,
        `   "✨ ${summary}"`,
        '',
      ]

      if (checkpoints.length > 0) {
        previewLines.push(`📦 ${count} 个 AI Checkpoint：`, ...checkpoints)
      }

      if (hasUncommitted) {
        previewLines.push(
          '',
          `📝 ${uncommittedFiles.length} 个未提交变更（将一并纳入）：`,
          ...uncommittedFiles.map(f => `  ${f}`),
        )
      }

      previewLines.push('', '确认无误后，请以 preview: false 重新调用 aig_squash 执行合并。')

      return {
        content: [{ type: 'text', text: previewLines.join('\n') }],
      }
    }

    // 正式执行：
    // 1. 如果有 Checkpoint，软回滚抹掉碎片，保留所有代码变更（含刚才 add 的未提交文件）
    if (count > 0) {
      git('reset', '--soft', `HEAD~${count}`)
    }

    // 2. 若无 Checkpoint 但有未提交文件，此时暂存区已有内容（git add . 已执行），直接提交即可
    const finalMsg = `✨ ${summary}`
    git('commit', '-m', finalMsg)

    const parts: string[] = []
    if (count > 0)
      parts.push(`${count} 个 AI Checkpoint`)
    if (hasUncommitted)
      parts.push(`${uncommittedFiles.length} 个未提交变更`)

    return {
      content: [
        {
          type: 'text',
          text: `🎉 完美收官！已将 ${parts.join(' + ')} 合并为 1 个正式提交：\n"${finalMsg}"`,
        },
      ],
    }
  },
}
