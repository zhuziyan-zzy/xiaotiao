---
description: 代码修改后推送 GitHub 并引导部署到阿里云服务器
---

# 部署流程

每次对项目文件做出修改后，**必须**按以下步骤执行：

## 1. Push 到 GitHub（两个仓库）

// turbo
```bash
cd /Users/zzzzy/Downloads/项目/xiaotiao-main
git add -A && git commit -m "<本次变更的简要说明>"
```

// turbo
```bash
cd /Users/zzzzy/Downloads/项目/xiaotiao-main
git push origin main
```

// turbo
```bash
cd /Users/zzzzy/Downloads/项目/xiaotiao-main
git push r4mondo main
```

## 2. 引导用户从 Mac 本地部署到服务器

**重要**: 服务器无法直接访问 GitHub，使用 rsync 从本地上传。

告知用户在 **Mac 终端** 依次执行以下命令：

```bash
# 一键上传并部署（复制粘贴即可）
rsync -avz --exclude='node_modules' --exclude='.venv' --exclude='dist' --exclude='.git' /Users/zzzzy/Downloads/项目/xiaotiao-main/ root@47.103.117.65:/root/xiaotiao-main/ && ssh root@47.103.117.65 "cd /root/xiaotiao-main && bash deploy/deploy.sh"
```

如果 rsync 不可用，使用 scp 替代：

```bash
cd /Users/zzzzy/Downloads/项目
tar czf /tmp/xiaotiao.tar.gz --exclude='node_modules' --exclude='.venv' --exclude='dist' --exclude='.git' xiaotiao-main
scp /tmp/xiaotiao.tar.gz root@47.103.117.65:/root/
ssh root@47.103.117.65 "cd /root && rm -rf xiaotiao-main && tar xzf xiaotiao.tar.gz && cd xiaotiao-main && bash deploy/deploy.sh"
```

## 注意事项
- deploy.sh 会自动检测 SCP 模式（无 .git 目录时跳过 git pull）
- 服务器 IP: 47.103.117.65，用户: root
- 项目根目录: /root/xiaotiao-main
