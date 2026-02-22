<div align="center">
<a href="https://arcadia.cool" target="_blank">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./public/assets/images/logo-dark-sub.png" width="240">
        <img src="./public/assets/images/logo-light-sub.png" alt="Arcadia" width="240">
    </picture>
</a>
<h1>一站式代码自动化运维平台</h1>
<p><code>Node.js</code> <code>tsx</code> <code>ts-node</code> <code>Deno</code> <code>Bun</code> <code>Python</code> <code>Go</code> <code>Rust</code> <code>Lua</code> <code>Ruby</code> <code>Perl</code> <code>C</code> <code>Shell</code></p>

<p>
    <strong>
        <a href="https://arcadia.cool" style="text-decoration: none;">官方网站</a>
    </strong>
</p>
</div>

## 介绍

Arcadia 源自希腊语 Αρκαδία，中文译名为 阿卡迪亚，它是希腊的一个二级行政区（州），位于伯罗奔尼撒半岛的中部山区，现被西方广泛引申为乌托邦，是传说中世界的中心位置，相当于中华文化中的世外桃源。

Arcadia 平台主要面向于脚本语言编程与运维，支持定时任务调度，有着完善的文件系统和底层CLI命令设计，适用于中小型团队与个人的开发与运维环境。

项目基于 TypeScript 全栈开发，采用了众多前沿技术，前端使用 Vue + Vite，后端使用 Node.js + Express + Prisma ORM。

> 更多内容详见官网

## 安装方法

```bash
docker run -dit \
--name arcadia \
--hostname arcadia \
--network bridge \
--restart always \
-p 5678:5678 \
-v /opt/arcadia/config:/arcadia/config \
-v /opt/arcadia/log:/arcadia/log \
-v /opt/arcadia/scripts:/arcadia/scripts \
-v /opt/arcadia/repo:/arcadia/repo \
-v /opt/arcadia/raw:/arcadia/raw \
-v /opt/arcadia/tgbot:/arcadia/tgbot \
supermanito/arcadia:beta
```

之后访问 `http://localhost:5678` 进入管理面板，初始用户名 `useradmin` 密码 `passwd`。

***

### LICENSE

Copyright © 2026, [SuperManito](https://github.com/SuperManito). Released under the [MIT](https://github.com/SuperManito/LinuxMirrors/blob/main/LICENSE).
