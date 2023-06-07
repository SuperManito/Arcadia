---
title: envm
description: 通过命令行管理全局环境变量
---

```
❖ 用户环境变量管理指令

  使用方法：

    envm add [<name> <value> <remark>]    ✧ 添加变量
    envm edit [<name> <value> <remark>]   ✧ 修改变量
    envm del [<name>]                     ✧ 删除变量
    envm search [<string>]                ✧ 查询变量
    envm enable <name>                    ✧ 启用变量
    envm disable <name>                   ✧ 禁用变量

  命令注释：

    [xxx] 可选的快捷子命令  <name> 环境变量名称  <value> 环境变量值  <remark> 环境变量备注  <string> 搜索关键字
```

该 CLI 指令专门用于管理全局环境变量，仅支持操作以 `export` 开头的全局环境变量，无法处理有关项目功能等普通变量

命令默认通过 `交互` 管理全局环境变量，支持快捷命令一键执行对应操作

在使用快捷命令时，如果变量的**值**或**备注内容**含有`空格`或其它`特殊符号`，应使用引号将其扩起来以表示整体

## 添加变量

```bash
envm add
```

- ### 快捷命令

  ```bash
  envm add <变量名称> <变量的值> <备注>
  ```

  可以省略 `<备注>` 参数，那么目标变量的备注内容将自动设置为登记时间以用于备忘记录

## 修改变量

```bash
envm edit
```

  - ### 快捷命令

  ```bash
  envm edit <变量名称> <变量新的值> <备注>
  ```

  可以省略 `<备注>` 参数即不修改备注内容，如果检测到未添加目标变量则将自动添加

## 删除变量

```bash
envm del
```

  - ### 快捷命令

  ```bash
  envm del <变量名称>
  ```

## 查询变量

```bash
envm search
```

- ### 快捷命令

  ```bash
  envm search <查询关键词>
  ```

## 启用/禁用变量

此命令的常规交互使用方法集成在修改变量功能中，与其它命令的快捷命令不同

```bash
envm enable/disable <变量名称>
```
