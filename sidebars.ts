import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: [
    {
      label: '介绍',
      type: 'doc',
      id: 'index',
    },
    {
      label: '更新日志',
      type: 'doc',
      id: 'changelog',
    },
    {
      label: '开始使用',
      type: 'category',
      link: {
        type: 'generated-index',
      },
      items: [
        'start/install',
        'start/panel',
        'start/environment',
        'start/update',
      ],
      collapsed: false,
    },
    {
      label: '用户配置',
      type: 'category',
      link: {
        type: 'doc',
        id: 'configuration/index',
      },
      items: [
        {
          label: '导入代码',
          type: 'category',
          link: {
            type: 'doc',
            id: 'configuration/import/index',
          },
          items: [
            {
              label: '代码仓库',
              type: 'category',
              link: {
                type: 'doc',
                id: 'configuration/import/repo/index',
              },
              items: [
                'configuration/import/repo/config',
                {
                  label: '仓库代理',
                  type: 'doc',
                  id: 'configuration/import/repo/proxy',
                  className: 'sidebar-channels',
                },
              ],
              collapsed: true,
            },
            {
              label: '远程文件',
              type: 'category',
              link: {
                type: 'doc',
                id: 'configuration/import/raw/index',
              },
              items: ['configuration/import/raw/config'],
              collapsed: true,
            },
          ],
          collapsed: true,
        },
        'configuration/main',
        'configuration/notify',
        'configuration/TelegramBot/index',
        // 'configuration/wskey',
      ],
      collapsed: false,
    },
    {
      label: '命令（CLI）',
      type: 'category',
      link: {
        type: 'doc',
        id: 'cli/index',
      },
      items: [
        {
          label: '运行代码相关',
          type: 'category',
          link: {
            type: 'generated-index',
          },
          items: [
            {
              label: 'run',
              type: 'doc',
              id: 'cli/script/run',
            },
            {
              label: 'stop',
              type: 'doc',
              id: 'cli/script/stop',
            },
            {
              label: 'list',
              type: 'doc',
              id: 'cli/script/list',
            },
            {
              label: 'ps',
              type: 'doc',
              id: 'cli/script/ps',
            },
            {
              label: 'cleanup',
              type: 'doc',
              id: 'cli/script/cleanup',
            },
          ],
          collapsed: true,
        },
        {
          label: '更新与升级',
          type: 'category',
          link: {
            type: 'generated-index',
          },
          items: [
            {
              label: 'update',
              type: 'doc',
              id: 'cli/update/update',
            },
            {
              label: 'upgrade',
              type: 'doc',
              id: 'cli/update/upgrade',
            },
          ],
          collapsed: true,
        },
        {
          label: '用户配置管理',
          type: 'category',
          link: {
            type: 'generated-index',
          },
          items: [
            {
              label: 'envm',
              type: 'doc',
              id: 'cli/config/envm',
            },
            {
              label: 'repo',
              type: 'doc',
              id: 'cli/config/repo',
            },
            {
              label: 'raw',
              type: 'doc',
              id: 'cli/config/raw',
            },
          ],
          collapsed: true,
        },
        {
          label: '服务功能控制',
          type: 'category',
          link: {
            type: 'generated-index',
          },
          items: [
            {
              label: 'service',
              type: 'doc',
              id: 'cli/server/service',
            },
            {
              label: 'tgbot',
              type: 'doc',
              id: 'cli/server/tgbot',
            },
          ],
          collapsed: true,
        },
        {
          label: '其它',
          type: 'doc',
          id: 'cli/sundry',
        },
      ],
      collapsed: false,
    },
    {
      label: '关于我们',
      type: 'doc',
      id: 'about',
    },
  ],
  dev: [
    {
      label: '应用程序接口',
      type: 'category',
      link: {
        type: 'doc',
        id: 'dev/api/index',
      },
      items: [
        {
          type: 'category',
          label: '内部接口',
          link: {
            type: 'doc',
            id: 'dev/api/internal/index',
          },
          items: [
            {
              label: 'User 用户',
              type: 'category',
              link: {
                type: 'generated-index',
              },
              items: [
                'dev/api/internal/user/auth',
                'dev/api/internal/user/info',
                'dev/api/internal/user/change-password',
              ],
              collapsed: true,
            },
            {
              label: 'File 文件系统',
              type: 'category',
              link: {
                type: 'generated-index',
              },
              items: [
                'dev/api/internal/file/get-content',
                'dev/api/internal/file/save-content',
                'dev/api/internal/file/delete',
                'dev/api/internal/file/tree',
                'dev/api/internal/file/attribute',
                'dev/api/internal/file/create',
                'dev/api/internal/file/move',
                'dev/api/internal/file/rename',
                'dev/api/internal/file/download',
                'dev/api/internal/file/upload',
              ],
              collapsed: true,
            },
            {
              label: 'Env 环境变量',
              type: 'category',
              link: {
                type: 'doc',
                id: 'dev/api/internal/env/index',
              },
              items: [
                'dev/api/internal/env/page',
                'dev/api/internal/env/create',
                'dev/api/internal/env/save',
                'dev/api/internal/env/delete',
                'dev/api/internal/env/order',
                'dev/api/internal/env/changeStatus',
              ],
              collapsed: true,
            },
            {
              label: 'Cron 定时任务',
              type: 'category',
              link: {
                type: 'doc',
                id: 'dev/api/internal/cron/index',
              },
              items: [
                'dev/api/internal/cron/page',
                'dev/api/internal/cron/create',
                'dev/api/internal/cron/edit',
                'dev/api/internal/cron/delete',
                'dev/api/internal/cron/order',
                'dev/api/internal/cron/bind-group',
                'dev/api/internal/cron/running-tasks',
                'dev/api/internal/cron/run',
                'dev/api/internal/cron/terminate',
              ],
              collapsed: true,
            },
            {
              label: '其它',
              type: 'category',
              link: {
                type: 'generated-index',
              },
              items: [
                'dev/api/internal/main/captcha',
                'dev/api/internal/main/run',
              ],
              collapsed: true,
            },
            // {
            //   type: 'category',
            //   label: 'Config',
            //   link: {
            //     type: 'generated-index',
            //   },
            //   items: [
            //     {
            //       type: 'category',
            //       label: 'type',
            //       link: {
            //         type: 'generated-index',
            //       },
            //       items: [
            //         'dev/api/internal/config/type/by-type',
            //         'dev/api/internal/config/type/by-type-single',
            //         'dev/api/internal/config/type/create',
            //         'dev/api/internal/config/type/delete',
            //         'dev/api/internal/config/type/edit',
            //         'dev/api/internal/config/type/page',
            //       ],
            //       collapsed: false,
            //     },
            //   ],
            //   collapsed: true,
            // },
          ],
          collapsed: false,
        },
        {
          label: '开放接口',
          type: 'category',
          link: {
            type: 'doc',
            id: 'dev/api/open/index',
          },
          items: [
            {
              label: 'Env 环境变量',
              type: 'doc',
              id: 'dev/api/open/env',
            },
            {
              label: 'Cron 定时任务',
              type: 'doc',
              id: 'dev/api/open/cron',
            },
            {
              label: 'File 文件系统',
              type: 'doc',
              id: 'dev/api/open/file',
            },
          ],
          collapsed: false,
        },
      ],
      collapsed: false,
    },
  ],
}

export default sidebars
