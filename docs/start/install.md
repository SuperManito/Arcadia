---
title: 安装流程
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { ICON } from '@site/src/components/Icon';
import Link from '@docusaurus/Link'
import APITable from '@site/src/components/APITable';
import CliInstall from '@site/src/components/CliInstall';
import ComposeInstall from '@site/src/components/ComposeInstall';

```mdx-code-block
<div className="alert alert--primary" role="alert">
  本项目依托容器技术需要安装相关容器服务才可以部署，由于运行环境复杂程度较高目前没有计划适配更多部署方式，如果你不了解该项技术或者没有安装相关服务那么请先阅读 <Link to="/docs/start/install-container-service"><strong>如何安装容器服务</strong></Link><br /><br />项目容器镜像基于 <Link to="https://www.alpinelinux.org"><strong>Alpine Linux</strong></Link> 构建，如有其它使用需求自行查阅相关资料
</div><br />
```

下方的选项卡分别对应不同的启动方式，不要重复执行，新手推荐使用默认命令行 Docker 方式进行部署

## 1. 启动你的容器

<Tabs>
<TabItem value="cli" label="CLI - 命令行">

```mdx-code-block
<CliInstall />
```

</TabItem>
<TabItem value="compose" label="Compose - 编排">

```mdx-code-block
<ComposeInstall />
```

</TabItem>
</Tabs>

:::info 命令帮助
1. 如果想让容器内文件映射在当前目录可将默认的 `/opt/arcadia` 修改为 `$(pwd)`，可自定义映射路径  
2. 映射目录必须映射第一行的 `config` 配置文件主机挂载目录，其它目录可以不映射  
3. 如果你正在旁路由则可能需要切换为 **host** 类型（桥接），找到 `network` 字样更改即可  
4. 不可以更改参数中 `:` 右边的内容，否则会导致后端服务无法正常访问  
5. 提示 `-bash: docker：Command not found/未找到命令` ? 请先阅读 [__如何安装容器服务__](/docs/start/install-container-service)  
6. 可以使用国内备用镜像 `registry.cn-hangzhou.aliyuncs.com/supermanito/arcadia:dev`

<details>

<summary>你需要了解的一些参数</summary>

- ### 用户挂载目录

  作用：将容器内的目录映射到宿主机，可直接在宿主机对相关文件进行操作，并且数据在正常情况下不会丢失

  ```mdx-code-block
  <APITable>
  ```

  |    名称    |      作用      |
  | :-------: | :------------: |
  | `config`  |   存放配置文件   |
  |   `log`   |   存放日志文件   |
  | `scripts` | 个人脚本文件目录 |
  |   `repo`  | 脚本仓库文件目录 |
  |   `raw`   | 远程脚本文件目录 |

  ```mdx-code-block
  </APITable>
  ```

</details>
:::

## 2. 检查启动状态

```bash
docker logs -f arcadia
```

请认真查看容器启动后的初始化进度并 **等待其运行完毕**，当输出 **容器启动成功** 字样后即可通过 `Ctrl + C` 退出查看  
如果报错导致容器没有启动成功那么请先自行检查原因，绝大多数问题都是由于网络环境所导致，你可以通过 [加入社区](/docs/about#%E7%A4%BE%E5%8C%BA) 来寻求帮助


## 3. 开始使用

访问 [http://localhost:5678](http://localhost:5678) 进入后台管理面板，初始用户名和密码分别是 `useradmin` `passwd`，首次登录后会引导你修改此认证信息

无法访问？我们提供了一份 [排除故障指南](/docs/start/panel#%E6%8E%92%E9%99%A4%E9%9D%A2%E6%9D%BF%E6%95%85%E9%9A%9C)，希望对你有所帮助

除后台管理面板外，项目支持强大的命令行指令，具体请翻阅 CLI 文档，有关用户配置的问题详见文档相关介绍和配置文件中的注释

```mdx-code-block
<div className="alert alert--success" role="alert">
  如果你使用的网络环境处于公网，请更改容器面板用于认证的用户名和密码，同时留意上次登录信息<br />提高网络安全防范意识，尽量不要将你的面板完全暴露在公网，若遭遇不法分子入侵，作者对于由此引起的任何后果概不负责
</div><br />
```

### 安装运行脚本依赖库

如果你是首次安装并启动容器建议先进入容器执行下面的命令，项目内置了一条预装脚本常用依赖的命令，用于满足市面上常见脚本的运行

```bash
arcadia env install
```

此外，你还需要掌握如何安装运行脚本依赖库这一基础性的知识

当脚本报错提示 `need module xxx` 类似字样说明缺少脚本运行所需的依赖库，看见 `module` 字样应立即联想到模块上  
如果缺少的依赖中带有 `/` 则表示本地依赖文件，一般开发者都会提供相关组件，注意与安装依赖库区分开不要弄混

<Tabs>
  <TabItem value="JavaScript" label="JavaScript / TypeScript" default>

  适用于 <ICON>vscode-icons:file-type-light-js</ICON> `.js` 和 <ICON>vscode-icons:file-type-typescript</ICON> `.ts` 脚本

  ```bash
  npm install -g <xxx>
  ```

  默认命令 `npm install <xxx>` 安装的依赖库是相对位置的，使用 `-g` 命令选项代表全局安装即不需要解决目录关系，因为一般来说这样安装更省事

  </TabItem>
  <TabItem value="Python" label="Python">

  适用于 <ICON>vscode-icons:file-type-python</ICON> `.py` 脚本

  ```bash
  pip3 install <xxx>
  ```

  </TabItem>
</Tabs>

### 自定义 Python 版本

如果你几乎不使用 Python 脚本那么请直接忽略这一部分的内容

受限于容器底层镜像，项目默认安装的 Python 版本为 3.11，这可能会产生一些兼容性问题

```bash title="Python 降级至 3.10 版本的参考命令"
apk del py3-pip
apk del python3
sed -i "s/v3\.18/v3\.17/g" /etc/apk/repositories
apk update -f
apk --no-cache add -f python3
apk --no-cache add -f py3-pip
```

重装完后你还需要执行下面的命令

```bash
pip3 install yq # 底层命令需要使用的依赖库
arcadia tgbot update # 如果你需要使用 TG 机器人，则需要执行此命令重装
```

### 了解目录结构

```text
./arcadia       根目录
├── config        配置文件目录（用户）
├── log           日志存放目录（用户）
├── repo          脚本仓库存放目录（用户）
├── raw           远程脚本文件存放目录（用户）
├── scripts       个人脚本文件存放目录（用户）
├── tgbot         电报机器人组件存放目录（用户）
├── sample        配置文件模版存放目录
├── shell         CLI底层命令源代码
├── web           前端静态文件和后端源代码
└── utils         扩展组件源代码
```
