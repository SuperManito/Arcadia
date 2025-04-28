import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: [
    'node_modules',
    'lib',
    '*.sh',
    '*.md',
    '*.woff',
    '*.ttf',
    '.vscode',
    '.idea',
    '.local',
    'prisma/**',
    'public/**',
    'sample/**',
    'shell/**',
  ],
  extends: ['@antfu'],
  rules: {
    // 忽略 jsdoc
    'jsdoc/check-alignment': 'off',
    'jsdoc/check-indentation': 'off',
    'jsdoc/check-param-names': 'off',
    'jsdoc/check-syntax': 'off',
    'jsdoc/check-types': 'off',
    'jsdoc/newline-after-description': 'off',
    'jsdoc/no-types': 'off',
    'jsdoc/require-description': 'off',
    'jsdoc/require-description-complete-sentence': 'off',
    'jsdoc/require-hyphen-before-param-description': 'off',
    'jsdoc/require-param': 'off',
    'jsdoc/require-param-description': 'off',
    'jsdoc/require-param-name': 'off',
    'jsdoc/require-param-type': 'off',
    'jsdoc/require-returns': 'off',
    'jsdoc/require-returns-check': 'off',
    'jsdoc/require-returns-description': 'off',
    'jsdoc/require-returns-type': 'off',
    // 自定义规则
    'no-unused-expressions': ['error', { allowShortCircuit: true }], // 允许短路表达式
    'perfectionist/sort-imports': 'off', // 关闭 import 排序规则
    'import/newline-after-import': 'off', // 关闭 import 后必须有新行的规则
    'no-console': 'off', // 允许使用 console
    'style/arrow-parens': 'off', // 关闭箭头函数参数括号的样式规则
    'regexp/no-unused-capturing-group': 'off', // 关闭未使用的捕获组规则
    'node/prefer-global/process': 'off', // 关闭优先使用全局 process 对象的规则
  },
})
