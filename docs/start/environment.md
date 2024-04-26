---
title: 运行环境
---
import { ICON } from '@site/src/components/Icon';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

##

## 安装语言环境

<Tabs>
  <TabItem value="py" label="Python">

  ```bash
  apk --no-cache add -f python3 py3-pip
  ```
  > 已预装，底层功能需要调用，不建议用户卸载

  - ### 自定义 Python 版本

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

  </TabItem>

  <TabItem value="ts" label="TypeScript" default>

  ```bash
  npm install -g typescript ts-node
  ```

  </TabItem>

  <TabItem value="go" label="Go">

  ```bash
  apk --no-cache add -f go
  ```

  </TabItem>

  <TabItem value="c" label="C">

  ```bash
  apk --no-cache add -f gcc
  ```

  </TabItem>

  <TabItem value="js" label="Node.js" default>

  ```bash
  apk --no-cache add -f nodejs-lts npm
  ```
  > 已预装，由于项目后端使用 Node.js 开发故用户不能卸载否则会导致项目无法正常运行

  </TabItem>
</Tabs>


## 安装依赖库

<Tabs>
  <TabItem value="js&ts" label="Node.js / TypeScript" default>

  适用于 <ICON>vscode-icons\:file-type-light-js</ICON> `.js` `.mjs` `.cjs` 和 <ICON>vscode-icons\:file-type-typescript</ICON> `.ts`

  ```bash
  npm install -g <xxx>
  ```
  当运行报错提示 `need module xxx` 类似字样说明缺少代码运行所需的依赖，对应 `xxx` 的位置就是缺失的依赖名称  
  如果依赖名称中开头为 `/` 则表示本地模块文件，否则一般为 <ICON size="18">logos\:npm-icon</ICON> [NPM](https://www.npmjs.com) 上的第三方库

  默认命令 `npm install <xxx>` 安装的依赖库是相对位置的，可以解决项目使用不同版本的依赖库问题  
  使用 `-g` 命令选项代表全局安装即不需要解决目录关系，因为一般来说这样安装更省事

  </TabItem>

  <TabItem value="py" label="Python">

  适用于 <ICON>vscode-icons\:file-type-python</ICON> `.py`

  ```bash
  pip3 install <xxx>
  ```

  </TabItem>

  <TabItem value="go" label="Go">

  适用于 <ICON>vscode-icons\:file-type-go</ICON> `.go`

  ```bash
  go get -u xxx
  ```

  </TabItem>
</Tabs>
