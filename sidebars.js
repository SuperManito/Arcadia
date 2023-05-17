/* eslint-disable no-undef */
module.exports = {
  docs: [
    'index',
    'start/about',
    'install/index',
    {
      type: 'category',
      label: '配置指南',
      link: {
        type: 'generated-index',
      },
      items: [
        {
          type: 'category',
          label: '导入脚本',
          link: {
            type: 'doc',
            id: 'configuration/script/index',
          },
          items: [
            {
              type: 'category',
              label: '脚本仓库',
              link: {
                type: 'doc',
                id: 'configuration/script/repo/index',
              },
              items: [
                'configuration/script/repo/config',
                'configuration/script/repo/proxy',
                'configuration/script/repo/quick-add',
              ],
              collapsed: true,
            },
            {
              type: 'category',
              label: '远程脚本',
              link: {
                type: 'doc',
                id: 'configuration/script/raw/index',
              },
              items: [
                'configuration/script/raw/config',
                'configuration/script/raw/quick-add',
              ],
              collapsed: true,
            },
          ],
          collapsed: true,
        },
        'configuration/notify',
        'configuration/tgbot',
        'configuration/extra',
        'configuration/wskey',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'CLI',
      link: {
        type: 'doc',
        id: 'cli/index',
      },
      items: [
        {
          type: 'category',
          label: 'task 指令',
          link: {
            type: 'generated-index',
          },
          items: ['cli/task/run', 'cli/task/env', 'cli/task/account', 'cli/task/sundry'],
          collapsed: true,
        },
        {
          type: 'category',
          label: 'taskctl 指令',
          link: {
            type: 'generated-index',
          },
          items: ['cli/taskctl/panel', 'cli/taskctl/tgbot', 'cli/taskctl/sundry'],
          collapsed: true,
        },
        {
          type: 'doc',
          label: 'update 指令',
          id: 'cli/update/index',
        },
      ],
      collapsed: false,
    },
    'panel',
    'update',
  ],
  api: [
    'api/index',
    {
      type: 'category',
      label: '内部接口',
      link: {
        type: 'doc',
        id: 'api/internal/index',
      },
      items: [
        {
          type: 'category',
          label: 'User',
          link: {
            type: 'generated-index',
          },
          items: ['api/internal/user/auth', 'api/internal/user/info', 'api/internal/user/change-password'],
          collapsed: false,
        },
        {
          type: 'category',
          label: 'File',
          link: {
            type: 'generated-index',
          },
          items: ['api/internal/file/get-content', 'api/internal/file/save-content', 'api/internal/file/delete', 'api/internal/file/tree', 'api/internal/file/attribute', 'api/internal/file/create', 'api/internal/file/move', 'api/internal/file/rename', 'api/internal/file/download', 'api/internal/file/upload'],
          collapsed: false,
        },
        {
          type: 'category',
          label: 'Cron',
          link: {
            type: 'generated-index',
          },
          items: ['api/internal/cron/page', 'api/internal/cron/create', 'api/internal/cron/edit', 'api/internal/cron/delete', 'api/internal/cron/order', 'api/internal/cron/bind-group'],
          collapsed: false,
        },
        {
          type: 'category',
          label: 'Main',
          link: {
            type: 'generated-index',
          },
          items: ['api/internal/main/captcha', 'api/internal/main/run'],
          collapsed: false,
        },
        {
          type: 'category',
          label: 'Config',
          link: {
            type: 'generated-index',
          },
          items: [
            {
              type: 'category',
              label: 'type',
              link: {
                type: 'generated-index',
              },
              items: ['api/internal/config/type/by-type', 'api/internal/config/type/by-type-single', 'api/internal/config/type/create', 'api/internal/config/type/delete', 'api/internal/config/type/edit', 'api/internal/config/type/page'],
              collapsed: false,
            },
          ],
          collapsed: false,
        },
      ],
      collapsed: false,
    },
    'api/open/index',
  ],
}
