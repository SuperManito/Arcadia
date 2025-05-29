---
title: 配置方法
---
import APITable from '@site/src/components/APITable';

本篇介绍配置远程文件的方法以及一些相关的配置项

你可以在管理面板点击 `编辑配置` - `下拉选择 sync.yml` 来在线编辑

## 主要配置项

<APITable>

| 名称 | 必填 | 类型 | 默认值 | 描述 |
| :-: | :-: | :-: | :-: | --- |
| `name` | 是 | `string` | 无 | 远程文件名称 |
| `url` | 是 | `string` | 无 | 远程文件地址 |
| `enable` | 否 | `boolean` | `true` | 是否启用该配置 |
| `cronSettings` | 否 | `object` | 无 | 定时任务设置 |

</APITable>

- ### cronSettings

  <APITable>
  | 名称 | 必填 | 类型 | 默认值 | 描述 |
  | :-: | :-: | :-: | :-: | --- |
  | `updateTaskList` | 否 | `boolean` | `false` | 是否为该配置涉及到的代码文件启用定时任务（默认不启用） |
  </APITable>

## 填法示例

```yaml
raw:
  - name: "Repo1"
    url: "https://gihub.com/User1/Repo1/raw/master/example.js"
    cronSettings:
      updateTaskList: true
  - name: "Repo2"
    url: "https://gihub.com/User2/Repo2/raw/master/template.py"
```

配置好后你需要执行 `arcadia update raw` 命令来使该配置生效

导入前请先确认目标脚本中的备注内容中是否含有 `Cron 表达式` ，如若没有或者未识别到那么将随机指定一个每天执行一次的定时规则

## 配置依赖文件

根据配置远程文件的原理，对应**raw**目录下只允许存在已配置的脚本，配置以外的文件会被删除，如果运行此处的脚本需要额外的依赖文件那么你需要配置此项

```yaml
gobal:
  rawDependencyFilter: "" # string
```
基于 [**grep**](https://www.runoob.com/linux/linux-comm-grep.html) 指令进行过滤（默认使用 `-E` 命令选项用于匹配多个表达式），支持正则表达式。如果要匹配多个表达式，那么根据该指令规范你需要使用 `|` 字符来进行分割，与代码仓库的定时任务黑白名单配置用法相同

## 删除已配置的远程文件

删除配置文件中的相关配置项即可，在更新后会自动删除脚本和定时，无需手动删除

## 快速添加配置

详见 CLI 文档教程 [添加远程文件配置](/docs/cli/config/raw)
