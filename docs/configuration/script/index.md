---
title: 导入脚本
---

如果你想导入来自互联网的脚本请看本部分教程，如果你想导入本地脚本请直接存放在 `scripts` 目录下

import DocCardList from '@theme/DocCardList';

<DocCardList />

## 关于定时任务

定时规则优先从脚本备注内容中获取，由独特的算法提供支持，如若没有或者未识别到那么将指定每天执行一次的随机定时规则，你可以在自动添加定时任务之后使用后台管理面板来自定义修改

执行命令为 `task run xxx` ，没有附加任何命令选项，如有需要请参考文档教程自行修改，可以直接调试

定时任务不会重复添加，不过在特殊环境下新增的定时任务会直接覆盖原有的定时任务，例如在迁移后的环境或重新克隆了仓库

定时任务的数据保存在 `config/config.db` 数据库文件中

定时规则采取 Unix 标注格式，支持6位秒级任务
