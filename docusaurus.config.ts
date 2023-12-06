import npm2yarn from '@docusaurus/remark-plugin-npm2yarn'
// 代码块高亮
import PrismLight from './src/prism/prismLight'
import PrismDark from './src/prism/prismDark'

import type { Config as DocusaurusConfig } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'
import type { Options as DocsOptions } from '@docusaurus/plugin-content-docs'
import type { Options as BlogOptions } from '@docusaurus/plugin-content-blog'
import type { Options as PageOptions } from '@docusaurus/plugin-content-pages'

export default async function createConfigAsync (): Promise<DocusaurusConfig> {
  return {
    // 必填
    title: 'Arcadia', // 网站名
    url: 'https://arcadia.cool',
    baseUrl: '/',

    tagline: '脚本运维面板（公测）', // 网站标语
    onBrokenLinks: 'ignore',
    onBrokenMarkdownLinks: 'ignore',
    favicon: 'img/favicon.ico',
    trailingSlash: false,
    organizationName: 'SuperManito', // Usually your GitHub org/user name.
    projectName: 'Arcadia', // Usually your repo name.
    deploymentBranch: 'gh-pages', // Branch that contains the docs.
    i18n: {
      defaultLocale: 'zh',
      locales: ['zh'],
      path: '/',
      localeConfigs: {
        zh: {
          label: '简体中文',
          direction: 'ltr',
          htmlLang: 'zh-CN',
          calendar: 'gregory'
        }
      }
    },
    // 经典预设包
    presets: [
      [
        '@docusaurus/preset-classic',
        {
          docs: {
            path: 'docs',
            sidebarCollapsible: true,
            sidebarCollapsed: false,
            sidebarPath: 'sidebars.ts',
            editUrl: 'https://github.com/SuperManito/Arcadia/tree/website',
            remarkPlugins: [npm2yarn],
            admonitions: {
              keywords: [
                'primary',
                'success'
              ],
              extendDefaults: true
            }
          } satisfies DocsOptions,
          pages: {
            remarkPlugins: [npm2yarn]
          } satisfies PageOptions,
          blog: {
            showReadingTime: true,
            path: 'blog',
            editUrl: 'https://github.com/SuperManito/Arcadia/tree/website',
            blogSidebarTitle: '最近的帖子',
            blogSidebarCount: 'ALL',
            remarkPlugins: [npm2yarn]
          } satisfies BlogOptions,
          // 自定义CSS
          theme: {
            customCss: require.resolve('./src/css/custom.css')
          },
          // Google Analytics
          gtag: {
            trackingID: 'G-P076XXL2MH',
            anonymizeIP: true
          },
          sitemap: {
            changefreq: 'weekly',
            priority: 0.5,
            ignorePatterns: ['/tags/**'],
            filename: 'sitemap.xml'
          },
          debug: false
        }
      ]
    ],

    themeConfig: {
      docs: {
        sidebar: {
          hideable: false,
          autoCollapseCategories: false
        }
      },
      announcementBar: {
        content: '🎉 已开始进行公共测试',
        backgroundColor: 'rgb(209 126 31)',
        textColor: '#fff',
        isCloseable: true
      },
      algolia: {
        appId: 'CAFZ8NG0JM',
        apiKey: 'a80af7dba41cb88ef2d909874911a5af',
        indexName: 'arcadia-panel',
        contextualSearch: true,
        searchPagePath: 'search'
      },
      zoom: {
        selector: '.markdown :not(em) > img',
        config: {
          background: {
            light: 'rgb(255, 255, 255)',
            dark: 'rgb(50, 50, 50)'
          }
        }
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false
      },
      navbar: {
        hideOnScroll: false,
        logo: {
          className: 'navbar-logo',
          src: 'img/logo/arcadia-light-sub.png',
          srcDark: 'img/logo/arcadia-dark-sub.png'
        },
        items: [
          {
            label: '文档',
            type: 'doc',
            position: 'left',
            docId: 'index',
            className: 'navbar-item'
          },
          {
            label: '应用程序接口',
            type: 'docSidebar',
            position: 'left',
            sidebarId: 'api',
            className: 'navbar-item'
          },
          {
            to: '/blog',
            label: '博客',
            position: 'left',
            className: 'navbar-item'
          },
          {
            to: 'http://issue.arcadia.cool/?lang=zh-CN',
            label: 'Issue（公共测试）',
            position: 'left',
            className: 'navbar-item'
          },
          {
            href: 'https://github.com/SuperManito/Arcadia/tree/website',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository'
          }
        ]
      },
      prism: {
        additionalLanguages: [
          'bash',
          'json'
        ],
        magicComments: [
          {
            className: 'theme-code-block-highlighted-line',
            line: 'highlight-next-line',
            block: { start: 'highlight-start', end: 'highlight-end' }
          },
          {
            className: 'code-block-error-line',
            line: 'This will error'
          }
        ],
        theme: PrismLight,
        darkTheme: PrismDark,
        defaultLanguage: 'javascript'
      }
    } satisfies Preset.ThemeConfig,
    plugins: [
      [
        require.resolve('docusaurus-plugin-image-zoom'),
        {
          id: 'docusaurus-plugin-image-zoom'
        }
      ]
    ]
  }
}
