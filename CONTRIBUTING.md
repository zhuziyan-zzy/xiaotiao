# Contributing Guide

## 分支策略

- `main`: 受保护分支，只通过 Pull Request 合并。
- 功能开发分支命名建议：
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `chore/<short-name>`

## 提交流程

1. 从 `main` 创建新分支。
2. 完成功能并本地验证：
   - 前端：`cd xiaotiao-app && npm run build`
   - 后端：`cd xiaotiao-server && python3 -m compileall main.py routers services schemas.py`
3. 提交代码并推送分支。
4. 创建 Pull Request，等待 CI 通过后再合并。

## Commit 规范（建议）

- `feat: ...` 新功能
- `fix: ...` 缺陷修复
- `chore: ...` 工程/脚本改动
- `docs: ...` 文档更新

## Pull Request 要求

- 描述清楚“改了什么、为什么改、如何验证”。
- 尽量小步提交，避免把无关改动混在一个 PR。
- 若涉及 UI 改动，附截图或录屏。

## 禁止提交内容

- API Key、Token、密码等敏感信息
- `.env`、数据库文件、`node_modules`、虚拟环境目录
