---
description: 后端服务管理
---

# 后端服务管理

目前前端面板由后端服务器来进行托管，项目部分功能的实现依赖于后端服务的持续正常运行，所有守护进程服务会由该命令统一管理

## 开启/重启服务

```bash
arcadia service start
```
当服务异常时会自动尝试修复

## 关闭服务

```bash
arcadia service stop
```
项目部分功能依赖后端服务持续运行，请不要长期关闭

## 查看服务状态信息

```bash
arcadia server status
```
如遇相关服务没有启动或状态异常，在容器初始成功的前提下请先尝试手动启动

## 查看信息

```bash
arcadia service info
```
如果忘记了登录密码可以用此方法查看

## 重置登录信息

```bash
arcadia service respwd
```
重置后的用户名和密码均为初始信息 `useradmin` `passwd`，此操作还会重置 Open API 令牌
