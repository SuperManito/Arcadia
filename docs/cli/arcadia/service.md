---
title: 后端服务
---

目前使用 Nodejs 来托管后台管理面板的 WEB 服务，因此后端服务跟前端是绑定在一起的。网页终端服务是后端管理面板的组件之一，对该服务的操作与此命令关联，它们是同步进行的

## 开启/重启服务

```bash
arcadia service start
```
当后端服务或网页终端服务异常时还可尝试修复

## 关闭服务

```bash
arcadia service stop
```
:::danger
项目镜像在构建时设置了健康检测（HEALTHCHECK），启动容器后会定时检测后端服务的状态，如果服务异常会自动重启，因此不建议手动关闭服务以免造成不必要的麻烦
:::

## 查看信息

```bash
arcadia service info
```
如果忘记了登录密码可以用此方法查看

## 重置登录信息

```bash
arcadia service respwd
```
重置后的用户名和密码均为初始信息 `useradmin` `passwd`，此操作还会重置 `openApiToken`
