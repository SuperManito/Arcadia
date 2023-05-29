import { h } from 'vue'
import { NP, NText, NUl, NA, NOl } from 'naive-ui'

export default {
  theme: null,
  'zh-CN': {
    lang: 'zh-CN',
    introTitle: '在你开始之前...',
    introOne: () => {
      return [
        h(NP, null, {
          default: () => [
            'Issue 列表只接受 Bug 报告或是功能请求 (Feature Requests)。这意味着我们不接受用法问题。如果你开的 issue 不符合规定，它将会被',
            h(NText, { strong: true }, { default: () => '立刻关闭' }),
            '。',
          ],
        }),
      ]
    },
    introWarningTitle: '不要用 Issue Helper 提使用问题！',
    introWarningContent: () => {
      return [
        '这只会让 Issue 被立即关闭，如果有使用问题可以加入社区群组求助：',
        h(
          NA,
          {
            href: 'https://t.me/ArcadiaPanelGroup',
            target: '_blank',
          },
          {
            default: () => 'ArcadiaPanelGroup',
          },
        ),
      ]
    },
    introTwo: () => {
      return [
        h(NP, null, {
          default: () => {
            return [
              '对于使用中遇到的问题，请使用以下资源：',
              h('br'),
              h(NUl, null, {
                default: () => {
                  return [
                    h(
                      'li',
                      null,
                      '仔细阅读文档：',
                      h(
                        NA,
                        {
                          href: 'https://arcadia.cool',
                          target: '_blank',
                        },
                        {
                          default: () => 'Arcadia Docs',
                        },
                      ),
                    ),
                  ]
                },
              }),
            ]
          },
        }),
        h(NP, null, {
          default: () =>
            '最后，在开 issue 前，可以先搜索一下以往的旧 issue — 你遇到的问题可能已经有人提了，也可能已经在最新版本中被修正。注意：如果你发现一个已经关闭的旧 issue 在最新版本中仍然存在，请不要在旧 issue 下面留言，而应该用下面的表单开一个新的 issue。',
        }),
      ]
    },
    explainTitle: '为什么要有这么严格的 issue 规定？',
    explain: () => [
      h(NP, null, {
        default: () => [
          '随着 Arcadia 在社区越来越受欢迎，我们每天都在收到越来越多的问题、bug 报告、功能需求和 Pull Requests。作为一个完全免费使用的项目，Arcadia 项目的维护人手是有限的。这意味着想要让项目长期的可持续发展，我们必须：',
        ],
      }),
      h(NOl, null, {
        default: () => [
          h(
            'li',
            null,
            '给予更具体的工作更高的优先级（比如 bug 的修复和新功能的开发）',
          ),
          h('li', null, '提高 issue 处理的效率'),
        ],
      }),
      h(NP, null, {
        default: () =>
          '针对（1），我们决定将 GitHub issue 列表严格地限制用于有具体目标和内容的工作。问题和讨论应当发送到更适合它们的场合。',
      }),
      h(NP, null, {
        default: () =>
          '针对（2），我们发现影响 issue 处理效率的最大因素是用户在开 issue 时没有提供足够的信息。这导致我们需要花费大量的时间去跟用户来回沟通，只为了获得一些基本信息好让我们对 issue 进行真正的分析。这正是我们开发 Issue Helper 的理由：我们要确保每个新 issue 都提供了必需的信息，这样能节省维护者和开发者双方的时间。',
      }),
      h(NP, null, {
        default: () =>
          '最重要的是，请明白一件事：开源项目的用户和维护者之间并不是甲方和乙方的关系，issue 也不是客服。在开 issue 的时候，请抱着一种『一起合作来解决这个问题』的心态，不要期待我们单方面地为你服务。',
      }),
    ],
    issueTypesHint: 'Issue 类别',
    issueTitleHint: 'Issue 标题',
    issueTypes: [
      { label: 'Bug', value: 'Bug' },
      { label: '新功能', value: 'New' },
    ],
    systemArchHint: '系统架构',
    systemPlatformHint: '运行环境',
    systemSelectItemPC: 'PC / 服务器 / VPS',
    systemSelectItemDockerPlugin: '路由器 / 网络存储设备',
    systemSelectItemOther: '其它',
    firstTip: '请检查在最新项目版本中能否重现此 issue。',
    expectHint: '期望的结果是什么',
    actualHint: '实际的结果是什么',
    remarks: '补充说明（可选）',
    remarksTips: '如果需要附上图片，请在点击预览按钮并进入仓库页面后上传添加',
    preview: '预览',
    valid: {
      title: '请填写 issue 标题',
      type: '请选择 issue 类别',
      systemArch: '请选择系统架构',
      systemPlatform: '请选择运行环境',
      expected: '请填写期望的结果',
      actual: '请填写实际的结果',
      functionContent: '请填写这个功能解决的问题',
    },
    loadingText: '加载中',
    noMatchText: '无匹配数据',
    noDataText: '无数据',
    dialog: {
      title: 'Issue 预览',
      button: '创建',
    },
    functionContent: '这个功能解决了什么问题',
    functionContentTip: '请尽可能详尽地说明这个需求的用例和场景，重要的是解释清楚是怎样的用户体验需求催生了这个功能上的需求。',
  },
  'en-US': {
    lang: 'en-US',
    introTitle: 'Before You Start...',
    introOne: () => {
      return h(NP, null, {
        default: () => [
          'The issue list is reserved exclusively for bug reports and feature requests. That means we do not accept usage questions. If you open an issue that does not conform to the requirements, ',
          h(
            NText,
            { strong: true },
            { default: () => 'it will be closed immediately' },
          ),
          '.',
        ],
      })
    },
    introWarningTitle: 'Don\'t use Issue Helper to ask usage questions!',
    introWarningContent: () => {
      return [
        'This will only cause issue to be shut down immediately. If you have any problems, you can join the community group for help: ',
        h(
          NA,
          {
            href: 'https://t.me/ArcadiaPanelGroup',
            target: '_blank',
          },
          {
            default: () => 'ArcadiaPanelGroup',
          },
        ),
        '.',
      ]
    },
    introTwo: () => {
      return [
        h(NP, null, {
          default: () => {
            return [
              'For usage questions, please use the following resources:',
              h('br'),
              h(NUl, null, {
                default: () => {
                  return [
                    h(
                      'li',
                      null,
                      'Read the introduce and components documentation: ',
                      h(
                        NA,
                        {
                          href: 'https://arcadia.cool',
                          target: '_blank',
                        },
                        {
                          default: () => 'Arcadia Docs',
                        },
                      ),
                    ),
                  ]
                },
              }),
            ]
          },
        }),
        h(NP, null, {
          default: () =>
            'Also try to search for your issue - it may have already been answered or even fixed in the development branch. However, if you find that an old, closed issue still persists in the latest version, you should open a new issue using the form below instead of commenting on the old issue.',
        }),
      ]
    },
    explainTitle: 'Why are we so strict about this?',
    explain: () => [
      h(NP, null, {
        default: () => [
          'As Arcadia\'s user base has grown, we are getting more and more usage questions, bug reports, feature requests and pull requests every single day. As a free project, Arcadia also has limited maintainer bandwidth. That means the only way to ensure the project\'s sustainability is to:',
        ],
      }),
      h(NOl, null, {
        default: () => [
          h(
            'li',
            null,
            'Prioritize more concrete work (bug fixes and new features).',
          ),
          h('li', null, 'Improve issue triaging efficiency.'),
        ],
      }),
      h(NP, null, {
        default: () =>
          'For (1), we have decided to use the GitHub issue lists exclusively for work that has well-defined, actionable goals. Questions and open ended discussions should be posted to mediums that are better suited for them.',
      }),
      h(NP, null, {
        default: () =>
          'For (2), we have found that issues that do not provide proper information upfront usually results in terribly inefficient back-and-forth communication just to extract the basic information needed for actual triaging. This is exactly why we have created this app: to ensure that every issue is created with the necessary information, and to save time on both sides.',
      }),
    ],
    issueTypesHint: 'Issue type',
    issueTitleHint: 'Issue title',
    issueTypes: [
      { label: 'Bug', value: 'Bug' },
      { label: 'Feature Request', value: 'New' },
    ],
    systemArchHint: 'System architecture',
    systemPlatformHint: 'Operating environment',
    systemSelectItemPC: 'PC / Server / VPS',
    systemSelectItemDockerPlugin: 'Router / Network Storage Device',
    systemSelectItemOther: 'Other',
    firstTip: 'Check if the issue is reproducible with the latest stable version.',
    expectHint: 'What is expected',
    actualHint: 'What is actually happening',
    remarks: 'Any additional comments (optional)',
    remarksTips: 'If you need to attach a picture, please enter the repo page to upload and add after clicking the preview.',
    preview: 'Preview',
    valid: {
      title: 'Issue title is required!',
      type: 'Type is required!',
      systemArch: 'System architecture is required!',
      systemPlatform: 'Operating Environment are required!',
      expected: 'What is expected is required!',
      actual: 'What is actually happening is required!',
      functionContent: 'What problem does this feature solve is required!',
    },
    loadingText: 'loading',
    noMatchText: 'No matching data',
    noDataText: 'No data',
    dialog: {
      title: 'Issue Preview',
      button: 'Create',
    },
    functionContent: 'What problem does this feature solve',
    functionContentTip: 'Explain your use case, context, and rationale behind this feature request. More importantly, what is the end user experience you are trying to build that led to the need for this feature?',
  },
}
