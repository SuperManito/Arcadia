---
title: 账号相关
description: 使用定制的一些命令来管理账号
---

与账号 Cookie 相关的命令

## 检测账号是否有效

```bash
task cookie check
```
会检测 `Cookie` 的状态，如果配置了 `wskey` 那么也会附带检测，更新日期从配置文件中的备注获取

- ### 检测指定账号（扩展用法）

  ```bash
  task cookie check <账号序号/用户名(pt_pin的值)>
  ```
  账号序号为该ck在配置文件中的编号

## 使用 WSKEY 更新账号

```bash
task cookie update
```
如有遇到 `更新异常` 请前往 **log/UpdateCookies** 查看日志，更新失败时命令会自动检测 `wskey` 的有效性

- ### 更新指定账号（扩展用法）

  ```bash
  task cookie update <账号序号/用户名(pt_pin的值)>
  ```
  账号序号为该ck在配置文件中的编号

## 查看本地账号清单

```bash
task cookie list
```
搭配系统 `grep` 指令使用可快速检索本地账号信息

## 查看豆子收支明细

```bash
task cookie beans
```
默认查看所有账号的收支，请勿频繁使用否则容易被官方限制IP，建议使用扩展用法

- ### 查看指定账号豆子收支明细（扩展用法）

  ```bash
  task cookie beans <账号序号/用户名(pt_pin的值)>
  ```
  账号序号为该ck在配置文件中的编号
