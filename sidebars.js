/* eslint-disable no-undef */
module.exports = {
  docs: [
    {
      label: '介绍',
      type: 'doc',
      id: 'index',
    },
    {
      label: '关于我们',
      type: 'doc',
      id: 'about',
    },
    {
      label: '开始使用',
      type: 'category',
      link: {
        type: 'generated-index',
      },
      items: [
        'start/install',
        'start/update',
        'start/panel',
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
          label: '导入脚本',
          type: 'category',
          link: {
            type: 'doc',
            id: 'configuration/script/index',
          },
          items: [
            {
              label: '脚本仓库',
              type: 'category',
              link: {
                type: 'doc',
                id: 'configuration/script/repo/index',
              },
              items: [
                'configuration/script/repo/config',
                {
                  label: '仓库代理',
                  type: 'doc',
                  id: 'configuration/script/repo/proxy',
                  className: 'sidebar-channels',
                },
                'configuration/script/repo/quick-add',
              ],
              collapsed: true,
            },
            {
              label: '远程脚本',
              type: 'category',
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
        'configuration/main',
        'configuration/notify',
        'configuration/TelegramBot/index',
        'configuration/wskey',
      ],
      collapsed: false,
    },
    {
      label: '命令行（CLI）',
      type: 'category',
      link: {
        type: 'doc',
        id: 'cli/index',
      },
      items: [
        {
          label: 'task',
          type: 'category',
          link: {
            type: 'generated-index',
          },
          items: [
            'cli/task/run',
            'cli/task/account',
            'cli/task/sundry',
          ],
          collapsed: true,
        },
        {
          label: 'arcadia',
          type: 'category',
          link: {
            type: 'generated-index',
          },
          items: [
            'cli/arcadia/service',
            'cli/arcadia/tgbot',
            'cli/arcadia/sundry',
          ],
          collapsed: true,
        },
        {
          label: 'update',
          type: 'doc',
          id: 'cli/update/index',
        },
        {
          label: 'envm',
          type: 'doc',
          id: 'cli/envm/index',
        },
      ],
      collapsed: false,
    },
    {
      label: '更新日志',
      type: 'doc',
      id: 'changelog',
    },
  ],
  api: [
    {
      label: '说明',
      type: 'doc',
      id: 'api/index',
    },
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
          items: [
            'api/internal/user/auth',
            'api/internal/user/info',
            'api/internal/user/change-password',
          ],
          collapsed: false,
        },
        {
          type: 'category',
          label: 'File',
          link: {
            type: 'generated-index',
          },
          items: [
            'api/internal/file/get-content',
            'api/internal/file/save-content',
            'api/internal/file/delete',
            'api/internal/file/tree',
            'api/internal/file/attribute',
            'api/internal/file/create',
            'api/internal/file/move',
            'api/internal/file/rename',
            'api/internal/file/download',
            'api/internal/file/upload',
          ],
          collapsed: false,
        },
        {
          type: 'category',
          label: 'Cron',
          link: {
            type: 'generated-index',
          },
          items: [
            'api/internal/cron/page',
            'api/internal/cron/create',
            'api/internal/cron/edit',
            'api/internal/cron/delete',
            'api/internal/cron/order',
            'api/internal/cron/bind-group',
          ],
          collapsed: false,
        },
        {
          type: 'category',
          label: 'Main',
          link: {
            type: 'generated-index',
          },
          items: [
            'api/internal/main/captcha',
            'api/internal/main/run',
          ],
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
              items: [
                'api/internal/config/type/by-type',
                'api/internal/config/type/by-type-single',
                'api/internal/config/type/create',
                'api/internal/config/type/delete',
                'api/internal/config/type/edit',
                'api/internal/config/type/page',
              ],
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
