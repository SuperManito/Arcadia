---
title: 更新升级
---

正式版的版本号格式为 `x.xx.xx`，其中第一位为主版本号，第二位为次版本号，第三位为修订版本号，更新修订版本无需重新部署直接更新项目源码即可，次版本根据更新日志的要求而定；如果你使用的是测试版本那么需要持续保持镜像容器至最新

<details>

<summary>自动更新镜像容器工具</summary>

使用 [watchtower](https://github.com/containrrr/watchtower) 自动更新镜像容器

```
docker run -d \
--name watchtower \
--restart unless-stopped \
-v /var/run/docker.sock:/var/run/docker.sock \
containrrr/watchtower -c \
--schedule "0 0 */2 * * *"
```

最下边的 Cron 表达式是更新频率（秒、分、时、日、月、周），可自行定义  
该工具容器会自动更新正在使用的镜像并在更新后自动重启相关容器

</details>

如果你想了解的是如何更新导入的脚本，那么请前往查看 [CLI 文档](/docs/cli/update)

## 更新源码

一般小版本升级直接更新源码即可

```bash
arcadia upgrade
```

如果你的网络环境不能有效连通 GitHub，那么则需要使用代理，下面提供一个简单且免费的方法

<details>
<summary>使用免费代理进行更新</summary>

```bash title="将项目官方远程仓库地址替换为开源代理地址"
cd /arcadia/src
git remote set-url origin https://ghp.ci/https://github.com/SuperManito/Arcadia.git
cd /arcadia
```

之后就可以愉快的使用 `arcadia upgrade` 了

</details>

## 更新容器

- #### 一键更新

  ```bash
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower -c --run-once arcadia
  ```

  可以通过此命令一键更新，不过需要注意的是更新镜像容器会删除已安装的环境例如 npm 依赖包等，需要重新安装

- #### 重新部署 

  根据通知要求而定，如果你想重新安装那么需要先删除运行中的容器和镜像

  ```bash
  docker rm -f arcadia
  docker rmi arcadia
  ```

  前往安装文档 [点此跳转](/docs/start/install)

## 更新配置文件

配置文件位于 config 目录下，最新的配置文件模板位于 src/sample 目录下，可通过后台管理面板的**对比工具**页面进行可视化对比操作，不建议使用命令手动进行替换
