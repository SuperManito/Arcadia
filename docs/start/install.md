---
title: 安装流程
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import APITable from '@site/src/components/APITable';
import Link from '@docusaurus/Link'

```mdx-code-block
<div className="alert alert--primary" role="alert">
  本项目依托容器技术需要安装相关容器服务才可以部署，由于运行环境复杂程度较高目前没有计划适配更多部署方式，如果你不了解该项技术或者没有安装相关服务那么请先阅读 <Link to="/docs/start/install-container-service">如何安装容器服务</Link>
</div>
```

## 启动你的容器（公共测试）

<Tabs>
<TabItem value="cli" label="CLI - 命令行">

```bash
docker run -dit \
--name arcadia `# 容器名` \
--hostname arcadia `# 主机名` \
--network bridge `# 容器网络类型` \
--restart always `# 开机自启` \
-p 5678:5678 `# 端口映射，"主机端口:容器端口"` \
-v /opt/arcadia/config:/arcadia/config `# 配置文件的主机挂载目录` \
-v /opt/arcadia/log:/arcadia/log `# 日志文件的主机挂载目录` \
-v /opt/arcadia/scripts:/arcadia/scripts `# 个人脚本的主机挂载目录` \
-v /opt/arcadia/repo:/arcadia/repo `# 脚本仓库的主机挂载目录` \
-v /opt/arcadia/raw:/arcadia/raw `# 远程脚本的主机挂载目录` \
-v /opt/arcadia/tgbot:/arcadia/tgbot `# 电报机器人的主机挂载目录` \
supermanito/arcadia:dev
```

</TabItem>
<TabItem value="compose" label="Compose - 编排">

- ### 新建 YAML 文件

  ```bash
  mkdir -p /opt/arcadia && cd /opt/arcadia
  vim docker-compose.yaml
  ```

- ### 编辑内容

  ```yaml
  version: "2.0"
  services:
    arcadia:
      image: supermanito/arcadia:dev  # 镜像名
      container_name: arcadia  # 容器名（可随意更改）
      hostname: arcadia  # 主机名（可随意更改）
      restart: always  # 开机自启
      tty: true
      network_mode: bridge  # 容器网络类型，如果是旁路由可能需要切换为 host 类型（桥接），默认为 NAT
      ports:
        - 5678:5678  # 端口映射，格式为 "主机端口:容器端口"，主机端口号可自定义，容器端口用来访问控制面板不可修改
      volumes:
        - /opt/arcadia/config:/arcadia/config       # 定义配置文件的主机挂载目录
        - /opt/arcadia/log:/arcadia/log             # 定义日志文件的主机挂载目录
        - /opt/arcadia/scripts:/arcadia/scripts     # 定义个人脚本的主机挂载目录
        - /opt/arcadia/repo:/arcadia/repo           # 定义脚本仓库的主机挂载目录
        - /opt/arcadia/raw:/arcadia/raw             # 定义远程脚本的主机挂载目录
  ```

- ### 启动容器

  ```bash
  docker-compose up -d
  ```

</TabItem>
</Tabs>

:::info 命令帮助
1. 如果想让容器内文件映射在当前目录可将默认的 `/opt/arcadia` 修改为 `$(pwd)`，可自定义映射路径  
2. 映射目录必须映射第一行的 `config` 配置文件主机挂载目录，其它目录可以不映射  
3. 如果你正在旁路由则可能需要切换为 **host** 类型（桥接），找到 `network` 字样更改即可  
4. 不可以更改参数中 `:` 右边的内容，否则会导致后端服务无法正常访问 
5. 提示 `-bash: docker：Command not found/未找到命令`  ? 请先阅读 [如何安装容器服务](/docs/start/install-container-service)
:::

:::tip
上方的选项卡分别对应两种启动方式，不要重复执行二选一即可，新手推荐使用命令行方式部署
:::

项目容器镜像基于 [__Alpine Linux__](https://www.alpinelinux.org) 构建，如有其它使用需求自行查阅相关资料

### 你需要了解的一些参数

- #### 用户挂载目录

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

## 检查启动状态

```bash
docker logs -f arcadia
```

:::info 须知
1. 请认真查看容器启动后的初始化进度并 **等待其运行完毕**，当输出 **容器启动成功** 字样后即可通过 `Ctrl + C` 退出查看  
2. 如果报错导致容器没有启动成功那么请先自行检查原因，绝大多数问题都是由于网络环境所导致，你可以通过 [加入社区](/docs/about#%E7%A4%BE%E5%8C%BA) 来寻求帮助
:::

## 开始使用

访问 [http://localhost:5678](http://localhost:5678) 进入后台管理面板，初始用户名为 `useradmin`，密码为 `passwd`，首次登录后会引导你修改此认证信息

:::tip
如果你使用的网络环境处于公网，请更改容器面板默认主机映射端口以及用于认证的用户名和密码，同时留意上次登录信息  
提高网络安全防范意识，尽量不要将你的面板完全暴露在公网，若遭遇不法分子入侵，作者对于由此引起的任何后果概不负责
:::

无法访问？我们提供了一份 [排除故障指南](/docs/start/panel#%E6%8E%92%E9%99%A4%E9%9D%A2%E6%9D%BF%E6%95%85%E9%9A%9C)，希望对你有所帮助

此外，项目支持强大的命令行指令，具体请翻阅 CLI 文档

### 预装运行脚本依赖

如果你是首次启动容器建议先进入容器执行下面的命令，项目内置了一条安装脚本常用依赖包的命令，涉及一些 npm 和 pip 依赖包，用于满足市面上大多数脚本的运行

```bash
arcadia env install
```

## 目录结构

```text
./arcadia                      根目录
├── config                       配置文件目录（用户）
├── log                          日志存放目录（用户）
├── repo                         脚本仓库存放目录（用户）
├── raw                          远程脚本文件存放目录（用户）
├── tgbot                        电报机器人组件存放目录（用户）
├── sample                       配置文件模版存放目录
├── shell                        CLI底层命令源代码
├── web                          前端静态文件和后端源代码
└── utils                        扩展组件源代码
```
