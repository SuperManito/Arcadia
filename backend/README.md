## 安装依赖

```bash
npm i
npm install -g pm2
```

## 配置开发环境（可选）

```bash
npm run generate
```

如果需要提交代码，请先在上级仓库主目录安装依赖

## 启动服务

```bash
pm2 start ../ecosystem.config.js
```
