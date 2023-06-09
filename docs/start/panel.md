---
title: 后台管理面板
---

- 默认通过 `http://localhost:5678` 访问，如若更改了面板服务的主机映射端口则需要访问对应端口
- 后台管理面板用于登录的初始用户名为 `useradmin` ，初始密码为 `passwd`

## 排除面板故障

这些是关于排除面板故障的解决步骤顺序和思路

- 检查容器运行状态，是否正常运行并初始化成功

  查看容器状态（宿主机）
  ```bash
  docker ps -a
  ```
  查看容器日志（宿主机）
  ```bash
  docker logs arcadia
  ```

- 检查面板服务状态，查看有无报错并进行验证

  查看服务状态（容器环境）
  ```bash
  pm2 status web_server
  ```
  查看服务日志（容器环境）
  ```bash
  pm2 logs web_server
  ```
  查看网页内容（容器环境）
  ```bash
  curl 127.0.0.1:5678/auth
  ```

  执行完此命令后如果有网页内容则表示服务启动正常

- 检查网络连通性

  若你使用 **VPS** 平台，请进入你所使用平台提供商的网络防火墙功能设置，检查是否已放开相关端口、允许`HTTP/HTTPS`流量通过等重要设置

  ```bash
  ping xxx
  nslookup xxx
  curl xxx
  ```
  1. 在容器内通过 `curl` 命令能获取到网页元素证明服务正常
  2. 在客户端通过 `ping` 命令不能获取到返回值证明存在网络连通性问题
  3. 在宿主机通过 `curl` 命令能获取到网页元素证明容器正常
  4. 在客户端通过 `curl` 命令不能获取到网页元素证明可能有防火墙介入

## 更改面板服务端口

:::info 用途
在不重新部署的情况下更改面板映射端口
:::

请在宿主机执行下面的命令

- 1. 进入相关目录

  ```bash
  cd /var/lib/docker/containers/$(docker inspect --format='{{.Id}}' arcadia)
  ```
  容器名默认为 `arcadia` ，如果不是则自行修改

- 2. 一键修改配置文件

  ```bash
  sed -i "s/HostPort.*\}\]\},/\"HostPort\":\"5678\"\}\]\},/g" hostconfig.json
  ```
  将命令中的 `5678` 替换成新的端口号即可

- 3. 重启 Docker 服务

  ```bash
  systemctl restart docker
  ```

## 反向代理

如果你需要通过域名使用建议使用反向代理，这里以 `nginx` 为例
```
server {
    listen 80;
    listen 443 ssl;
    server_name <域名>;

    ssl_certificate <证书文件路径（crt）>;
    ssl_certificate_key <证书私钥路径（crt）>;

    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
