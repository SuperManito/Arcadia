// @ts-nocheck
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  // 必填
  title: 'Arcadia', // 网站名
  url: 'https://arcadia.cool',
  baseUrl: '/',

  tagline: '脚本运维面板', // 网站标语
  onBrokenLinks: 'ignore',
  onBrokenMarkdownLinks: 'ignore',
  favicon: 'img/favicon.ico',
  trailingSlash: false,
  organizationName: 'SuperManito', // Usually your GitHub org/user name.
  projectName: 'Arcadia', // Usually your repo name.
  deploymentBranch: 'gh-pages', // Branch that contains the docs.
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN'],
  },
  // 经典预设包
  presets: [
    [
      '@docusaurus/preset-classic',
      ({
        docs: {
          path: 'docs',
          sidebarCollapsible: true,
          sidebarCollapsed: false,
          sidebarPath: 'sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/SuperManito/Arcadia/tree/website',
          remarkPlugins: [
            [require('@docusaurus/remark-plugin-npm2yarn'), { sync: true }],
          ],
        },
        pages: {
          remarkPlugins: [require('@docusaurus/remark-plugin-npm2yarn')],
        },
        blog: {
          showReadingTime: true,
          path: 'blog',
          editUrl: 'https://github.com/SuperManito/Arcadia/tree/website',
          blogSidebarTitle: '最近的帖子',
        },
        // 自定义CSS
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        // Google Analytics
        gtag: {
          trackingID: 'G-P076XXL2MH',
          anonymizeIP: true,
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
        debug: false,
      }),
    ],
  ],

  themeConfig:
    ({
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: false,
        },
      },
      algolia: {
        appId: '9XOFOP4RAZ',
        apiKey: '60e3e90d5b4cd5d1842e6139f234cca0',
        indexName: 'jdhelloworld-dev',
        contextualSearch: true,
        searchPagePath: 'search',
      },
      zoom: {
        selector: '.markdown :not(em) > img',
        config: {
          background: {
            light: 'rgb(255, 255, 255)',
            dark: 'rgb(50, 50, 50)',
          },
        },
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        hideOnScroll: false,
        logo: {
          className: 'navbar-logo',
          src: 'img/logo/arcadia-light-sub.png',
          srcDark: 'img/logo/arcadia-dark-sub.png',
        },
        items: [
          {
            label: '文档',
            type: 'doc',
            position: 'left',
            docId: 'index',
            className: 'navbar-item',
          },
          {
            label: '快速开始',
            href: '/docs/install',
            position: 'left',
            className: 'navbar-item',
          },
          {
            label: '应用程序接口',
            type: 'docSidebar',
            position: 'left',
            sidebarId: 'api',
            className: 'navbar-item',
          },
          {
            to: '/blog',
            label: '博客',
            position: 'left',
            className: 'navbar-item',
          },
          {
            to: 'https://arcadia-issue-helper.netlify.app/?lang=zh-CN',
            label: 'Issue（公共测试）',
            position: 'left',
            className: 'navbar-item',
          },
          {
            href: 'https://github.com/SuperManito/Arcadia/tree/website',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'light',
        copyright: `Copyright © ${new Date().getFullYear()} SuperManito`,
      },
      prism: {
        magicComments: [
          {
            className: 'theme-code-block-highlighted-line',
            line: 'highlight-next-line',
            block: { start: 'highlight-start', end: 'highlight-end' },
          },
          {
            className: 'code-block-error-line',
            line: 'This will error',
          },
        ],
      },
    }),
  plugins: [
    [
      require.resolve('docusaurus-plugin-image-zoom'),
      {
        id: 'docusaurus-plugin-image-zoom',
      },
    ],
  ],
}

async function createConfig () {
  // 代码块高亮
  const lightTheme = (await import('./src/prism/prismLight.mjs')).default
  const darkTheme = (await import('./src/prism/prismDark.mjs')).default
  config.themeConfig.prism.theme = lightTheme
  config.themeConfig.prism.darkTheme = darkTheme
  config.themeConfig.prism.defaultLanguage = 'javascript'
  return config
}

module.exports = createConfig
