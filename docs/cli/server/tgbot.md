---
description: 电报机器人服务管理
---

# 电报机器人服务管理

## 启动/重启服务

```bash
arcadia tgbot start
```

<details>
<summary>正常状态下的日志（点开查看）</summary>

```log
2024-00-00 00:00:00,000-telethon.network.mtprotosender-INFO=> [_connect] Connecting to xx.xx.xx.xx:443/TcpFull...
2024-00-00 00:00:00,000-telethon.network.mtprotosender-INFO=> [_connect] Connection to xx.xx.xx.xx:443/TcpFull complete!
2024-00-00 00:00:00,000-tgbot-INFO=> [<module>] loading bot module...
2024-00-00 00:00:00,000-tgbot-INFO=> [load_module] Bot加载-->setshort-->完成
2024-00-00 00:00:00,000-tgbot-INFO=> [load_module] Bot加载-->start-->完成
2024-00-00 00:00:00,000-tgbot-INFO=> [load_module] Bot加载-->sendfile-->完成
2024-00-00 00:00:00,000-tgbot-INFO=> [load_module] Bot加载-->update-->完成
.....
...
.
2024-00-00 00:00:00,000-tgbot-INFO=> [load_module] Bot加载-->help-->完成
```
如上，显示各个模块加载完成即表示连接正常，在配置正确的前提下如若一直重复建立连接那可能是网络环境出现了问题

</details>

## 停止服务

```bash
arcadia tgbot stop
```

## 查看运行日志

```bash
arcadia tgbot logs
```

## 查看错误日志

```bash
pm2 logs tgbot
```

## 更新升级

```bash
arcadia tgbot update
```
使用本地最新源码重装

:::warning 注意
执行安装操作后底层代码目前仅支持无缝迁移 **tgbot/diy** 目录下的用户文件，请注意提前备份你放置在 **tgbot** 目录下除 **tgbot/diy** 子目录以外的其它重要文件
:::
