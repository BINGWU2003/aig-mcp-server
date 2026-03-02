import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  ignores: [
    'dist',
    'node_modules',
    '.git',
    '.idea',
    '.vscode',
    'coverage',
    '*.log',
    '*.lock',
    '*.md',
    '*.tsbuildinfo',
    'pnpm-lock.yaml',
    'package.json',
    'pnpm-workspace.yaml',
  ],
})
