module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'standard-with-typescript',
    './.eslintrc-auto-import.json',
  ],
  overrides: [
  ],
  parserOptions: {
    extraFileExtensions: ['.vue'],
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: [
    'vue',
    '@typescript-eslint',
  ],
  rules: {
    quotes: ['error', 'single'],
    'comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
}
