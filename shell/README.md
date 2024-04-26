## 应用程序设计

- 1. 只有 `main.sh` 脚本是调用命令的主入口，根目录下的脚本为项目指令（软链接），其它脚本均为模块脚本，目录以功能和命令划分

- 2. 模块脚本不可单独执行，代码中只允许存在函数，函数名不可使用 `main` 并且需要唯一，除 `core` 和 `utils` 目录外其它目录均为子命令模块

- 3. 终端打印消息默认分为 `success`、`complete`、`warn`、`error`、`fail`、`tip`、`working` 八种类型，为了美观需要在起止处空行

  - `success` 成功
  - `complete` 完成
  - `warn` 警告
  - `error` 错误
  - `fail` 失败
  - `tip` 提示
  - `working` 工作中

## 代码规范

全局禁止使用小驼峰命名法，内部变量需使用 `local` 声明，以下是具体规范

- 所有函数名称和内部变量或方法需遵循短横线命名法

- 跨作用域使用的变量禁止全字母小写，对于内部变量需使用大驼峰命名法，与用户配置相关的常量需要全部大写

## 导入脚本模块

根据项目应用程序设计已将内容模块化，需要通过 `import` 封装（函数）命令导入模块脚本，下面是使用示例

例：导入 `run/main.sh`

```bash
import run
```

例：导入 `utils/request.sh`

```bash
import utils/request
```

## 关于创建新模块脚本

赋予可执行权限
```bash
git update-index --add <xxx.sh>
git update-index --chmod=+x <xxx.sh>
```
一键赋予可执行权限
```bash
git ls-files -z | xargs -0 git update-index --chmod=+x
```
需要注意换行问题，如果是在 Windows 下编辑的文件默认会使用 _CRLF_ 作为换行符即 `\r\n`，需要转换为 Unix 格式的 _LF_ 换行符即 `\n` 以应用于项目实际使用环境
可以通过 Git 全局配置来解决这一问题 `git config --global core.autocrlf false`，并且需要在 IDE 编辑器中设置 _LF_ 为默认换行符
