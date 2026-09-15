# 通知渠道模块

这个模块负责把告警消息推送到各种第三方服务（Telegram、钉钉、Bark、飞书等）。如果还没有你正在使用的推送服务，欢迎按本指南适配一个并提交 PR，只需要一个新文件加一行登记。

## 工作原理

一个渠道就是一个文件 `push/<渠道>.ts`，导出一个 `ChannelDefinition` 对象，包含三样东西：

- `type`：渠道唯一键，服务名小写（如 `'telegram'`、`'serverchan'`）。
- `configRules`：配置字段白名单，保存配置时约束并清洗配置对象，只保留列表中的字段。
- `pusher`：推送器，一个异步函数，直接写在定义对象中，负责调用目标服务的 API 把消息发出去。

`push/index.ts` 用一张 `Channels` 表汇总全部渠道定义；`registry.ts` 基于它自动完成注册与类型派生；`dispatch` 是统一发送入口。新增渠道不需要修改这些文件的逻辑，只要在 `Channels` 表里加一行。

## pusher 的参数

推送器签名为 `(config, payload) => Promise<void>`，两个参数的说明：

- `config`：本渠道的配置对象，类型就是文件里定义的 `XConfig`。除了渠道自身字段，还带一个可选的 `general`（`footer` / `messageTemplate` / `proxy`，见「你免费获得的通用能力」）。传入前已按 `configRules` 白名单清洗，格式校验在用户保存时完成，推送器不需要重复校验。
- `payload`：待推送的消息 `{ title, content }`，两者可能为空字符串。
- 返回 `Promise<void>`：正常返回即推送成功；失败时 `throw new Error(...)`，错误信息会作为"推送失败"的原因展示给用户。

## 新增渠道的步骤

1. 新建 `push/<渠道>.ts`：导出渠道定义（唯一键 + 字段白名单 + 推送器）和配置类型。
2. 在 `push/index.ts` 的 `Channels` 表登记一行。
3. 提交 PR。前端配置表单在私有仓库中由维护者同步，无需包含前端改动。

## 完整示例：适配 foo 服务

### `push/foo.ts`（新建）

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
- 配置接口无需导出，外部通过派生的 `ChannelConfig` 联合拿到它。
- `FooConfig` 的字段就是用户配置渠道时要填的内容，继承 `BaseChannelConfig` 可自动获得通用能力（见下文）。
- `configRules` 是保存配置时的字段白名单，不在列表中的字段会被丢弃。每项格式为 `[字段名, [是否必填, 类型]]`，类型支持 `'string'` / `'number'` / `'boolean'` / `'string[]'` / `'object'` 或枚举数组。
- 写推送器需要知道的两件事：
  - **`request` 不会抛出异常**。网络错误、非 2xx 响应等都以 `result.success === false` 返回（错误信息在 `result.error`），所以必须主动判断并用 `throw new Error(...)` 报告失败。抛出的错误信息会作为"推送失败"的原因反馈给用户，请写清楚是什么问题。
  - **很多服务的 API 用 HTTP 200 + 错误码表示业务失败**（如 Bark 以 `{ code: 200 }` 表示成功）。这类渠道需要再检查 `result.data`，业务失败同样 `throw`，可参考 `push/bark.ts`。

`request` 返回值的字段说明：

| 字段 | 说明 |
| ---- | ---- |
| `success` | 请求是否成功（HTTP 2xx） |
| `status` | HTTP 状态码，未收到响应时为 null |
| `data` | 响应体，JSON 自动解析，解析失败保留原始字符串 |
| `headers` | 响应头 |
| `error` | 失败原因，成功时为 null |
| `connected` | 是否已建立连接（收到 4xx / 5xx 响应也算已连接） |

### `push/index.ts`（修改）

```ts
// 新增 import（与现有渠道并列）：
import { Foo } from './foo'

// Channels 表按首字母序新增一行：
//   Foo,
```

## 你免费获得的通用能力

推送器无需实现以下功能，框架会自动处理或通过 `config.general` 提供：

- **通知尾（footer）**：用户自定义的通知尾部文字，发送前自动追加到正文末尾。
- **HTTP 代理（proxy）**：用户配置的代理地址，推送器把它传给 `request` 的 `proxy` 键即可生效（走 CLI 的渠道如 `apprise` 除外）。
- **消息模板（messageTemplate）**：适用于"标题和正文拼成一段文本发送"的渠道（API 没有独立标题字段）。用 `applyTemplate` 渲染正文：

```ts
import { applyTemplate } from '../applyTemplate'

const text = applyTemplate(payload, config.general)
if (text === null) {
  // 用户模板渲染后为空，表示无需推送
}
```

未配置模板时自动以"标题 + 空行 + 正文"拼接；配置后 `{{title}}` / `{{content}}` 两个占位符可只写其一。如果你的渠道 API 有独立标题字段（如钉钉、pushplus），直接使用 `payload.title` / `payload.content`，不需要模板。

## 其他约定

- 配置的格式校验在用户保存时已完成，推送器不需要重复校验；只有目标 API 有特殊要求时（如取值范围、参数转换）才在推送器内检查，并以 `throw` 报告。
- 新增渠道不需要改数据库：`channel.type` 是普通字符串、`config` 是 JSON 文本，没有 schema、migrate 步骤。
