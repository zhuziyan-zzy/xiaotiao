---
description: how to safely deploy code to the server without losing database data
---

# Safe Server Deployment Workflow

// turbo-all

## Steps

1. Pull latest code on server:
```bash
ssh root@47.103.117.65 "cd /root/xiaotiao-main && git pull origin main"
```

2. Sync backend code (EXCLUDES database files, uploads, and venv):
```bash
ssh root@47.103.117.65 "rsync -av --exclude='.git' --exclude='node_modules' --exclude='venv' --exclude='._*' --exclude='*.db' --exclude='uploads/*' --exclude='__pycache__' /root/xiaotiao-main/xiaotiao-server/ /home/xiaotiao/xiaotiao-server/"
```

3. Copy .env config (only if you changed .env settings):
```bash
ssh root@47.103.117.65 "cp /root/xiaotiao-main/xiaotiao-server/.env /home/xiaotiao/xiaotiao-server/.env"
```

4. Sync frontend code:
```bash
ssh root@47.103.117.65 "rsync -av --exclude='.git' --exclude='node_modules' --exclude='._*' /root/xiaotiao-main/xiaotiao-app/ /home/xiaotiao/xiaotiao-app/"
```

5. Restart backend:
```bash
ssh root@47.103.117.65 "pkill -f uvicorn; sleep 2; cd /home/xiaotiao/xiaotiao-server && ./venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 3000 &"
```

## CRITICAL SAFETY RULES

> [!CAUTION]
> NEVER use rsync without `--exclude='*.db'` when syncing to the server.
> Database files contain all user data and history.
> The `--exclude='uploads/*'` also protects user-uploaded files.
