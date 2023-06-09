---
title: 安装容器服务
---
import Tabs from '@theme/Tabs'
import TabItem from '@theme/TabItem'
import Link from '@docusaurus/Link'
import { ICON } from '@site/src/components/Icon';

如果你不知道 <ICON>mdi:docker</ICON> Docker 是什么，那跟着装它就对了。当然，如果你会 Podman、Kubernetes 什么的，那就看着用吧。

## Docker Engine

:::tip 友情提示
根据下方的选项卡选择对应你的操作系统，不要重复执行安装命令
:::

<Tabs groupId="operating-systems">
  <TabItem value="linux" label="Linux" default>

  #### 一键脚本

  ```bash
  bash <(curl -sSL https://linuxmirrors.cn/docker.sh)
  ```

  该一键脚本由本项目作者开发，项目地址：[SuperManito/LinuxMirrors](https://github.com/SuperManito/LinuxMirrors)，如果你觉得脚本好用麻烦送颗星⭐

  #### 其它

  ```bash
  curl -sSL https://get.daocloud.io/docker | sh Aliyun
  ```

  官方脚本通用安装方法，如果上方脚本跑不了就用这个

  </TabItem>

  <TabItem value="windows" label="Windows">

  建议使用 [Docker Desktop](https://docs.docker.com/desktop/windows/install)

  </TabItem>

  <TabItem value="macos" label="macOS">

  ```bash
  brew cask install docker
  ```

  可通过 [brew](https://github.com/Homebrew/brew) 包管理工具进行安装，但仍建议使用 [Docker Desktop](https://docs.docker.com/desktop/mac/install)，并且支持 Apple Silicon 芯片

  </TabItem>
</Tabs>

ㅤ

## Docker Compose _（可选）_

:::info 这是什么？
Docker 官方推出的容器编排工具，用于批量部署、管理容器等操作，基于 Docker Engine 引擎
:::

最新的 Docker Compose V2 版本已经集成在 Cli 中，你只需要通过包管理工具安装 **docker-compose-plugin** 软件包即可，例如 `apt-get install -y docker-compose-plugin`

ㅤ

<Link className="button button--lg button--primary button--outline button--block" to="/docs/start/install#%E5%90%AF%E5%8A%A8%E4%BD%A0%E7%9A%84%E5%AE%B9%E5%99%A8">返回安装文档</Link>
