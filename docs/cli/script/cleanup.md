---
description: 终止阻塞的代码进程
---

# 清理进程

```bash
arcadia cleanup
```
默认杀死距离启动超过 `6` 小时以上的阻塞进程，通过此命令可以释放占用内存以维护项目稳定运行

- 清理已卡死超过指定小时数的进程（扩展用法）

  ```bash
  arcadia cleanup <hours>
  ```
