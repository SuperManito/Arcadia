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

- ### 推送器 pusher 参数说明

  推送器签名为 `(config, payload) => Promise<void>`，两个参数的说明：

  - `config`：本渠道的配置对象，类型就是文件里定义的 `XXXConfig`。除了渠道自身字段，还带一个可选的 `general`（`footer` / `messageTemplate` / `proxy`。传入前已按 `configRules` 白名单清洗，格式校验在用户保存时完成，推送器不需要重复校验。
  - `payload`：待推送的消息 `{ title, content }`，两者可能为空字符串。
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

- 无独立标题时的处理方式：

  若渠道无独立标题则需要将标题并入至消息内容中，通过 `applyTemplate` 内置方法自动处理。  
  届时会涉及到自定义消息模板（通用配置）场景，可能会遇到无任何内容的情况，所以空消息内容时需要 return 处理 

  ```ts
  import { applyTemplate } from '../applyTemplate'
  ...

  export const Foo = {
    ...
    pusher: async (config, payload) => {
      const content = applyTemplate(payload, config.general)
      if (content === null)
        return

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
