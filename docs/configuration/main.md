---
title: 主要配置
---

本篇介绍一些关键的用户配置

## 用户环境变量

环境变量主要用于在运行脚本时传递参数，在配置文件中用 `export` 关键字声明的变量为全局环境变量，否则为局部变量，只有全局变量才能被运行的脚本所识别到

```bash title="示例"
export ENV="Arcadia"
```
你可以定义在 `config.sh` 主要配置文件中的指定区域，建议使用后台管理面板来在线管理

## 项目功能

在主要配置文件中的一些配置项

```mdx-code-block
<div className="alert alert--primary" role="alert">
  <code>config.sh</code> 主要用来存储用户的配置信息（变量），由于需要经常调用所以不适合存放任何实际执行的命令
</div>
```

### 脚本全局代理

:::note 后台管理面板入口
编辑配置 - 下拉选择 `config.sh`
:::

项目对接了 [global-agent](https://github.com/gajus/global-agent) 模块，支持在运行脚本时使用全局代理，仅支持 JavaScript 和 TypeScript 脚本

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

:::note 后台管理面板入口
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
