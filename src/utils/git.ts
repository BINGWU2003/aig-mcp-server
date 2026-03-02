import { execFileSync } from 'node:child_process'

/**
 * 安全执行 git 命令（参数数组形式，防止 Shell 注入）
 */
export function git(...args: string[]): string {
  return execFileSync('git', args, { stdio: 'pipe', encoding: 'utf-8' }).trim()
}

/**
 * 检查当前目录是否是 Git 仓库，不是则抛出友好错误
 */
export function assertGitRepo(): void {
  try {
    git('rev-parse', '--is-inside-work-tree')
  }
  catch {
    throw new Error('当前目录不是 Git 仓库，请先执行 git init')
  }
}
