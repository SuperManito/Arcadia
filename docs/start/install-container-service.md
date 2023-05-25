---
title: 安装容器服务
---
import Tabs from '@theme/Tabs'
import TabItem from '@theme/TabItem'

如果你不知道 Docker 是什么，那跟着装它就对了。当然，如果你会 Podman、Kubernetes 什么的，那就看着用吧。

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

<Tabs>
<TabItem value="x86" label="x86 架构">

```bash
# 拉取指定版本
curl -L https://ghproxy.com/https://github.com/docker/compose/releases/download/1.29.2/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose
# 赋予权限
chmod +x /usr/local/bin/docker-compose
```

</TabItem>
<TabItem value="arm" label="ARM 架构">

```bash
pip3 install docker-compose
```

</TabItem>
</Tabs>


:::tip
[**点此返回安装文档**](/docs/start/install#%E5%90%AF%E5%8A%A8%E4%BD%A0%E7%9A%84%E5%AE%B9%E5%99%A8)
:::
