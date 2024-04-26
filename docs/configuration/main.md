---
title: 主要配置
---

本篇介绍一些关键的用户配置

## 用户环境变量

环境变量是控制代码行为的主要途径之一，项目对于配置环境变量的方式有两套设计  
可以在前端面板环境变量专属页面进行可视化配置，也可以直接定义在 `config.sh` 主要配置文件中

下面具体介绍两种配置方式

### 1. 环境变量 · 管理面板

前端页面使用分页数据表格进行可视化管理，项目对环境变量功能有着独特的设计，分为 `普通变量` 与 `复合变量`  
复合变量是普通变量的高级应用，它可以将多个值分开管理最后合并成一个值，实现了更加灵活的配置以此满足用户需求

该功能用户配置数据存储于用户数据库文件中，每次修改后都会在用户配置文件目录下自动生成 `env.sh` 批量声明脚本，以此便于底层命令的加载和调用

### 2. 主要配置文件

主要配置文件即 `config.sh`，你可以通过面板编辑配置页面选择编辑

首先你需要知道的是在配置文件中用 `export` 关键字声明的变量为全局变量，否则为局部变量，只有全局变量配置的信息才能被所运行的代码文件获取，局部变量一般用于控制内部项目功能

```bash title="示例"
export TEST_ENV="Hello World!"
```

在配置文件中声明全局环境变量是一种更加直接的底层配置方式，因为由数据库存储的另一种配置方式最终也会转换成这种形式

你需要知道的：  
根据项目设计，主要配置文件中的环境变量加载优先级会低于数据库生成的环境变量批量加载脚本，这意味着若存在相同变量那么会被主配置文件定义的变量覆盖

## 项目功能

在主要配置文件中的一些配置项

:::primary
  <code>config.sh</code> 主要用来存储用户的配置信息（变量），由于需要经常调用所以不适合存放任何实际执行的命令
:::

### 脚本全局代理

:::note 管理面板入口
编辑配置 - 下拉选择 `config.sh`
:::

项目对接了 [global-agent](https://github.com/gajus/global-agent) 模块，支持在运行脚本时使用全局代理，仅支持 Node.js 和 TypeScript 脚本

```bash
EnableGlobalProxy="" # 功能开关，如想启用请赋值为 "true"
```

定义 HTTP 代理地址（必填）

```bash
export GLOBAL_AGENT_HTTP_PROXY=""
```

为 HTTPS 请求指定单独的代理（选填）

```bash
export GLOBAL_AGENT_HTTPS_PROXY=""
```

如果未设置此变量那么两种协议的请求均通过 HTTP 代理地址变量设定的地址

#### 指定使用代理的脚本

如果只是想在执行部分脚本时使用代理，可以参考下方 [case](https://www.junmajinlong.com/shell/script_course/shell_flow_control) 语句的例子来控制，脚本名称请去掉后缀格式，同时注意代码缩进
```bash
case $1 in
test)
  EnableGlobalProxy="true"    ## 在执行 test 脚本时启用代理
  ;;
utils | warp)
  EnableGlobalProxy="true"    ## 在执行 utils 和 warp 脚本时启用代理
  ;;
*)
  EnableGlobalProxy="false"
  ;;
esac
```
`$1` 为去掉文件格式后缀的脚本名称

### 用户自定义脚本

:::note 管理面板入口
编辑配置 - 下拉选择 `config.sh`
:::

底层命令开放了很多入口允许用户运行额外的 Shell 脚本，主要用于修改项目内置功能或满足个人额外的使用需求

#### 更新

在每次执行更新命令时（运行最后）额外运行用户自定义的 Shell 脚本  
如若使用必须将脚本命名为 `update_extra.sh` 并且放置在 **config** 配置文件目录下

```bash
EnableUpdateExtra="" # 功能开关，如想启用请赋值为 "true"
```

##### 同步来自互联网的脚本

自动将互联网上的脚本下载到本地并作为自定义更新脚本使用

```bash
EnableUpdateExtraSync="" # 功能开关，如想启用请赋值为 "true"
UpdateExtraSyncUrl="" # 同步地址（url）
```

#### 初始化

在每次启动容器时（运行最后）额外运行用户自定义的 Shell 脚本，包括并发任务  
如若使用必须将脚本命名为 `init_extra.sh` 并且放置在 **config** 配置文件目录下

```bash
EnableInitExtra="" # 功能开关，如想启用请赋值为 "true"
```

#### 运行脚本

在每次运行任务脚本前后额外运行用户自定义的 Shell 脚本  
必须将脚本命名为 `task_before.sh`（运行前）或 `task_after.sh`（运行后）并且放置在 **config** 目录下

```bash
EnableTaskBeforeExtra="" # 功能开关，如想启用请赋值为 "true"
EnableTaskAfterExtra="" # 功能开关，如想启用请赋值为 "true"
```
