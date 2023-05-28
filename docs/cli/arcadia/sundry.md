---
title: 杂项
description: 一些互无关联的功能
---

## 查看服务状态

```bash
arcadia server status
```
如遇相关服务没有启动或状态异常，在容器初始成功的前提下请先尝试手动启动

## 安装运行脚本常用依赖

```bash
arcadia env install
```
安装常用模块以便于运行一些常见的脚本

## 修复环境

```bash
arcadia env repairs
```
当 npm 崩溃时可执行此命令进行修复

## 检查配置文件完整性

```bash
arcadia check config
```
检查项目相关配置文件是否存在，如果缺失就从模板中重新导入
