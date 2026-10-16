# 通知渠道模块

## 新增渠道的步骤

1. 新建 `providers/<渠道>.ts`：导出渠道定义（唯一键 + 字段白名单 + 推送器）和配置类型。
  
   ```ts
   export const XXX = {
     type: 'xxx',
     configRules: [
       ...
     ],
     pusher: async (config, payload) => {
       ...
     },
   } satisfies ChannelDefinition<XXXConfig>
   ```

2. 在 `providers/index.ts` 中进行注册。

- ### 可选定义字段

  - `singleBody: true`：无独立标题字段的渠道标记。无自定义消息模板时，上层 `pushChannel` 会自动把标题并入正文（`标题\n\n正文`）传入推送器，推送器只读 `payload.content`，参考 `providers/telegram.ts`。
  - `summaryTitle: true`：配合 `singleBody` 使用，标记标题还会作为通知摘要/卡片标题使用（如 WxPusher 的 summary）。声明后不视为无独立标题渠道，"无标题渠道仅发正文"开关对其不生效，参考 `providers/wxpusher.ts`。
  - `rateLimit: { concurrency, limits }`：发送凭据的接口请求频率限制，`limits` 为滑动窗口数组（每项"任意 `seconds` 秒内最多 `count` 次"，可多层叠加如 5 次/秒 + 100 次/分钟），`concurrency` 为同时在途请求上限，`pushChannel` 按渠道类型执行（算法与 Sentinel 同款滑动窗口），计数口径按推送次数计，推送器内部的前置请求（如取 access_token）与 429 重试不另计名额。未声明走默认值（每秒 10 次 / 并发 3），仅官方明确限流的渠道才声明，参考 `providers/feishu.ts`。
  - `validateConfig(config)`：保存期校验钩子，在 `configRules` 清洗后调用，用于规则表达不了的跨字段约束（如互备字段至少填一项），失败 `throw` 即拒绝保存，参考 `providers/wxpusher.ts`。

- ### 推送器 pusher 参数说明

  推送器签名为 `(config, payload) => Promise<void>`，两个参数的说明：

  - `config`：本渠道的配置对象，类型就是文件里定义的 `XXXConfig`。除了渠道自身字段，还带一个可选的 `general`（`footer` / `messageTemplate` / `proxy`）。传入前已按 `configRules` 白名单清洗，格式校验在用户保存时完成，推送器不需要重复校验。
  - `payload`：待推送的消息 `{ title, content }`。通知尾追加、自定义消息模板渲染（渲染结果覆盖 `content`，`title` 保留原文供 summary / 卡片标题等场景使用）、`singleBody` 标题合并与推送前对 `title` / `content` 的首尾清理（去除换行符与空白字符，全渠道生效）均已在 `pushChannel` 完成，推送器直接使用即可。
  - 返回 `Promise<void>`：正常返回即推送成功；失败时 `throw new Error(...)`，错误信息会作为"推送失败"的原因展示给用户。

## 完整示例（适配 foo 服务）

> 只演示 HTTP 请求类通知渠道的适配方式

### `providers/foo.ts`（新建）

```ts
import type { BaseChannelConfig, ChannelDefinition } from '../types'
import { request } from '../../../utils/httpUtil'

interface FooConfig extends BaseChannelConfig {
  apiKey: string
  /** 优先级 */
  priority?: number
}

export const Foo = {
  type: 'foo',
  configRules: [
    ['apiKey', [true, 'string']],
    ['priority', [false, 'number']],
  ],
  pusher: async (config, payload) => {
    const body = {
      key: config.apiKey,
      title: payload.title,
      content: payload.content,
    }
    const result = await request({
      method: 'POST',
      url: 'https://api.foo.com/send',
      data: body,
      headers: { 'Content-Type': 'application/json' },
      proxy: config.general?.proxy,
    })
    if (!result.success) {
      throw new Error(`Foo 请求失败：${result.error ?? '未知错误'}`)
    }
  },
} satisfies ChannelDefinition<FooConfig>
```

说明：

- 唯一键 `'foo'` 只在定义对象里写一次，`satisfies` 保证结构符合 `ChannelDefinition` 并保留字面量类型；`pusher` 的参数类型也由它推导，无需手动标注。
- `FooConfig` 的字段就是用户配置渠道时要填的内容
- `configRules` 是保存配置时的字段白名单，不在列表中的字段会被丢弃。每项格式为 `[字段名, [是否必填, 类型]]`，类型支持 `'string'` / `'number'` / `'boolean'` / `'string[]'` / `'object'` 或枚举数组。可参考其它推送器的写法。

- `request` 封装 HTTP 请求方法说明

  - 传参配置对象

    | 字段 | 说明 |
    | ---- | ---- |
    | `method` | HTTP 方法，如 `'GET'` / `'POST'` |
    | `url` | 请求 URL |
    | `data` | 请求体，通常为 JSON 对象 |
    | `params` | URL 查询参数对象 |
    | `headers` | 请求头对象，默认提供 UA `Arcadia/<version>` |

    `proxy: config.general?.proxy,` 用于绑定自定义 HTTP 请求代理（通用配置）  

    更多配置详见 [axios](https://axios.rest/zh/pages/advanced/request-config)

  - 返回值

    | 字段 | 说明 |
    | ---- | ---- |
    | `success` | 请求是否成功（HTTP 2xx） |
    | `status` | HTTP 状态码，未收到响应时为 null |
    | `data` | 响应体，JSON 自动解析，解析失败保留原始字符串 |
    | `headers` | 响应头 |
    | `error` | 失败原因，成功时为 null |
    | `connected` | 是否已建立连接（收到 4xx / 5xx 响应也算已连接） |

- 无独立标题的处理方式：

  在渠道定义上标记 `singleBody: true`，标题与正文的合并（以及自定义消息模板渲染）由上层 `pushChannel` 统一处理，推送器只读 `payload.content`：

  ```ts
  export const Foo = {
    ...
    singleBody: true,
    pusher: async (config, payload) => {
      // 直接使用 payload.content，无需关心标题合并与模板渲染
      ...
    },
  } satisfies ChannelDefinition<FooConfig>
  ```

- 写推送器需要知道的两件事：
  - **`request` 不会抛出异常**。网络错误、非 2xx 响应等都以 `result.success === false` 返回（错误信息在 `result.error`），所以必须主动判断并用 `throw new Error(...)` 报告失败。抛出的错误信息会作为"推送失败"的原因反馈给用户，请写清楚是什么问题。
  - **很多服务的 API 用 HTTP 200 + 错误码表示业务失败**（如 Bark 以 `{ code: 200 }` 表示成功）。这类渠道需要再检查 `result.data`，业务失败同样 `throw`，可参考 `providers/bark.ts`。

### `providers/index.ts`（修改）

```ts
// 新增 import（与现有渠道并列）：
import { Foo } from './foo'

// Channels 表按首字母序新增一行：
export const Channels = {
  ...
  Foo,
  ...
}
```

提交前请先运行完成前检查 `npm run lint:fix` 与 `npm run tsc`。
