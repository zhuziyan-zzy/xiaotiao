---
description: 安全部署前端/后端代码到服务器
---

# 部署到服务器

## ⚠️ 安全规则（绝不违反）

1. **绝不**覆盖服务器上的 `.env` 文件
2. **绝不**覆盖服务器上的 `db/*.db` 数据库文件
3. **绝不**覆盖服务器上的 `.venv/` 虚拟环境
4. **绝不**覆盖服务器上的 `uploads/` 用户上传文件
5. **绝不**对后端代码使用 `rsync --delete`
6. 只有前端 `dist/` 目录可以使用 `--delete`（因为是完整构建产物）

## 部署前端

// turbo
1. 构建前端（确保 VITE_API_BASE_URL 为空）:
```bash
cd /Users/zzzzy/Downloads/项目/xiaotiao-main/xiaotiao-app && VITE_API_BASE_URL="" npm run build
```

2. 同步到服务器（只同步 dist，需要输入密码）:
```bash
cd /Users/zzzzy/Downloads/项目/xiaotiao-main && bash deploy/sync.sh frontend
```

## 部署后端代码

1. 同步后端代码到服务器:
```bash
cd /Users/zzzzy/Downloads/项目/xiaotiao-main && bash deploy/sync.sh backend
```

## 全部部署

```bash
cd /Users/zzzzy/Downloads/项目/xiaotiao-main && bash deploy/sync.sh all
```

## 注意事项

- 所有 rsync 命令必须在 **Mac 本地终端**运行，不是在服务器 SSH 里
- 服务器 IP: `47.103.117.65`
- 服务器项目路径: `/root/xiaotiao-main/`
- 后端服务名: `xiaotiao` (systemd)
- 后端 venv 路径: `/root/xiaotiao-main/xiaotiao-server/.venv/`（注意是 .venv 带点）
