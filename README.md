<p align="center">
    <a href="https://arcadia.cool" target="_blank">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="./public/images/logo-dark-sub.png" width="320">
            <img src="./public/images/logo-light-sub.png" alt="Arcadia" width="320">
        </picture>
    </a>
</p>

<p align="center">
    <strong>
        一站式代码运维平台
    </strong>
</p>

<p align="center">
    <strong>
        <a href="https://arcadia.cool" style="text-decoration: none;">官方网站</a>
    </strong>
</p>

## 介绍

Arcadia 源自希腊语 Αρκαδία，中文译名为 阿卡迪亚，它是希腊的一个二级行政区（州），位于伯罗奔尼撒半岛的中部山区，现被西方广泛引申为乌托邦，是传说中世界的中心位置，相当于中华文化中的世外桃源。

Arcadia 平台主要面向于脚本语言编程与运维，支持定时任务调度，有着完善的文件系统和底层CLI命令设计，适用于中小型团队与个人的开发与运维环境。

项目基于 TypeScript 全栈开发，采用了众多前沿技术，前端使用 Vue + Vite，后端使用 Node.js + Express + Prisma ORM。

## 支持的编程语言

已适配可直接运行代码文件的语言环境如下

| 类型 | 涉及文件格式 |
| :-: | :-: |
| JavaScript | `.js` `.mjs` `.cjs` |
| TypeScript | `.ts` `.mts` `.cts` |
| Python | `.py` |
| Go | `.go` |
| Lua | `.lua` |
| Rust | `.rs` |
| Ruby | `.rb` |
| Perl | `.pl` |
| C | `.c` |
| Shell | `.sh` |

`Node.js` `tsx` `ts-node` `Deno` `Bun` `Python` `Go` `Rust` `Lua` `Ruby` `Perl` `C` `Shell`

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

之后访问 `http://localhost:5678` 进入管理面板

***

### LICENSE

Copyright © 2025, [SuperManito](https://github.com/SuperManito). Released under the [MIT](https://github.com/SuperManito/LinuxMirrors/blob/main/LICENSE).
