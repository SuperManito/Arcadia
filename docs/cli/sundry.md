---
title: 杂项
---

## 删除日志

```bash
arcadia rmlog
```
删除一定天数的由项目和运行代码产生的各类日志文件，默认删除 `7` 天以上的日志，可以通过配置文件中的 `RmLogDaysAgo` 变量更改此默认时间

  - ### 删除指定天数的日志（扩展用法）

    ```bash
    arcadia rmlog <days>
    ```

## 主动推送消息通知

```bash
arcadia notify <tittle> <content>
```
`tittle` **通知标题** `content` **通知内容**

主动推送指定内容的通知消息，支持转义字符，如果内容或标题中**存在空格**则需要用**引号**将参数扩起来
