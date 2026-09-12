# core/push 通知渠道模块

告警通知的渠道适配层：注册表模式，一渠道一推送器，纯 `request()` HTTP 调用。对外只经 `index.ts` barrel 暴露 `dispatch` / `cleanChannelConfig` / `CHANNEL_TYPES` / `ChannelType`。

## 目录职责

| 文件 / 目录 | 职责 |
| --- | --- |
| `index.ts` | 纯 barrel：`import './registry'` 触发注册 + re-export `types` / `dispatch` / `registerPusher` |
| `registry.ts` | `registerPusher` 机制 + 全部渠道注册聚合（**新增渠道在此登记**） |
| `dispatch.ts` | `PushError` / `cleanChannelConfig`（保存时字段筛查）/ `dispatch`（解析 JSON → 校验 → 推送） |
| `types.ts` | 共享类型与常量：`Pusher` / `PushPayload` / `ChannelType` / `CHANNEL_TYPES` / `CHANNEL_CONFIG_RULES` / `ChannelConfig` |
| `config/<渠道>.d.ts` | 单渠道配置类型 `XxxConfig`（一渠道一文件） |
| `channels/<渠道>.ts` | 单渠道推送器，默认导出 `pushXxx` |

## 新增渠道流程

以 `foo` 为例，按序改 4 处：

**1. 定类型** — 新建 `config/foo.d.ts`（可选字段才写注释，注释只写 label）：

```ts
export interface FooConfig {
  apiKey: string
  /** 优先级 */
  priority?: number
}
```

**2. 写推送器** — 新建 `channels/foo.ts`，默认导出 `pushFoo`：

```ts
import type { FooConfig } from '../config/foo'
import type { PushPayload } from '../types'
import { request } from '../../../utils/httpUtil'

/**
 * Foo 渠道推送器
 *
 * @param config.apiKey API Key
 * @param config.priority 优先级
 */
export default async function pushFoo(config: FooConfig, payload: PushPayload) {
  const result = await request({
    method: 'POST',
    url: 'https://api.foo.com/send',
    body: { key: config.apiKey, title: payload.title, content: payload.content },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!result.success) {
    throw new Error(`Foo 请求失败：${result.error ?? '未知错误'}`)
  }
}
```

**3. 注册** — `registry.ts`：顶部 import 推送器，底部加一行 `registerPusher`：

```ts
import pushFoo from './channels/foo'
// ...
registerPusher('foo', pushFoo)
```

**4. 补常量** — `types.ts` 三处：

- `CHANNEL_TYPES` 加 `'foo'`（按首字母序）；
- `CHANNEL_CONFIG_RULES` 加 `foo: [['apiKey', [true, 'string']], ['priority', [false, 'number']]]`；
- 顶部 `import type { FooConfig } from './config/foo'`，`ChannelConfig` 联合追加 `| FooConfig`。

> 前端另需同步：`setting.ts` 的 `notifyChannel.type.foo` + `config.foo.*`（label / info）、`channelFormSchema.ts` 表单、`alertModel.ts` 类型。

## 封装约束（速查）

- **后端只筛字段**：`cleanChannelConfig` 按白名单过滤 + trim / 数组去重，**不校验、不改写字段值**。
- **值校验交前端**：min-max、正则、必填、枚举、JSON 合法性等前端能做的，后端不重复。
- **复杂校验在推送器内抛错**：确需二次校验的复杂内容放 `pushFoo` 内，失败**必须 `throw`**，绝不“钳制 / 格式化后继续请求”。
- **结构转换也在推送器内**：白名单无法表达的结构转换（如 wxpusher `topicIds` 字符串数组 → 正整数数组）同样放 `pushXxx` 内于推送时完成，失败一并 `throw`；保存清洗阶段不做结构转换。
- **注释只写 label**：字段注释与 `@param` 只写 label（对齐前端 `setting.ts`），不写默认值 / 枚举 / 格式 / 用法；仅保留解释非显然行为的一行内联注释。

## 无需数据库变更

`alertChannel.type` 是普通 `String`（非 enum）、`config` 是 JSON 字符串。**新增渠道类型无需改 schema、migrate、`npm run generate`**，合法性由 `CHANNEL_TYPES` + `CHANNEL_CONFIG_RULES` 把关。
