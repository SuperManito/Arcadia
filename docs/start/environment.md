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
  apt-get install -y python3 python3-pip
  ```
  > 已预装，底层功能需要调用，不建议用户卸载

  </TabItem>

  <TabItem value="ts" label="TypeScript">

  ```bash
  npm install -g typescript ts-node
  ```

  </TabItem>

  <TabItem value="go" label="Go">

  ```bash
  apt-get install -y go
  ```

  </TabItem>

  <TabItem value="c" label="C">

  ```bash
  apt-get install -y gcc
  ```
  > 已预装

  </TabItem>

  <TabItem value="js" label="Node.js">

  ```bash
  NODE_MAJOR=20 # 指定安装版本（自行修改）
  apt-get update && apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
  apt-get update && apt-get install nodejs -y
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
  pip3 install <xxx> --no-cache-dir --break-system-packages
  ```

  </TabItem>

  <TabItem value="go" label="Go">

  适用于 <ICON>vscode-icons\:file-type-go</ICON> `.go`

  ```bash
  go get -u xxx
  ```

  </TabItem>
</Tabs>
