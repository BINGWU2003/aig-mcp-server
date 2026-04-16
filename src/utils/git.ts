import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

export function resolveWorkspacePath(args: Record<string, unknown>): string {
  const rawPath = args.workspacePath
  if (typeof rawPath !== 'string' || rawPath.trim() === '') {
    throw new Error('缺少必填参数 workspacePath，请传入项目根目录路径')
  }

  return resolve(rawPath.trim())
}

/**
 * 安全执行 git 命令（参数数组形式，防止 Shell 注入）
 */
export function git(workspacePath: string, ...args: string[]): string {
  return execFileSync('git', ['-C', workspacePath, ...args], { stdio: 'pipe', encoding: 'utf-8' }).trim()
}

/**
 * 检查 workspacePath 是否是 Git 仓库，不是则抛出友好错误
 */
export function assertGitRepo(workspacePath: string): void {
  try {
    const result = git(workspacePath, 'rev-parse', '--is-inside-work-tree')
    if (result !== 'true')
      throw new Error('not-git-repo')
  }
  catch {
    throw new Error(`workspacePath 不是 Git 仓库: ${workspacePath}`)
  }
}
