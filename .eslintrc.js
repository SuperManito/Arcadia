module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['plugin:@docusaurus/recommended', 'plugin:react/recommended', 'eslint-config-love'],
  overrides: [],
  parserOptions: {
    project: ['tsconfig.json'],
    extraFileExtensions: ['.mdx'],
    ecmaVersion: 'latest',
    tsconfigRootDir: __dirname,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  plugins: ['react'],
  rules: {
    // '@docusaurus/no-untranslated-text': [
    //   'warn',
    //   { ignoredStrings: ['·', '—', '×'] },
    // ],
    'comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@docusaurus/no-untranslated-text': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
  },
}
