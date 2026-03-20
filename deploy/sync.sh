#!/usr/bin/env bash
# ========================================================
# 小挑 — 安全同步脚本（仅同步代码，不触碰服务器数据）
# ========================================================
# ⚠️  安全规则（永远不可违反）:
#   1. 绝不同步/覆盖服务器上的 .env 文件
#   2. 绝不同步/覆盖服务器上的 db/*.db 数据库文件
#   3. 绝不同步/覆盖服务器上的 .venv 虚拟环境
#   4. 绝不同步/覆盖服务器上的 uploads/ 用户上传文件
#   5. 后端代码同步不使用 --delete，只追加/更新文件
#   6. 前端 dist 可以使用 --delete（因为是完整构建产物）
# ========================================================
# 用法（在 Mac 终端运行）:
#   cd /Users/zzzzy/Downloads/项目/xiaotiao-main
#   bash deploy/sync.sh          # 仅同步前端 dist（最常用）
#   bash deploy/sync.sh frontend # 同上
#   bash deploy/sync.sh backend  # 仅同步后端 .py 和 .j2 代码文件
#   bash deploy/sync.sh all      # 同步前端 + 后端代码
# ========================================================
set -euo pipefail

# ---- 配置 ----
SERVER_USER="root"
SERVER_IP="47.103.117.65"
SERVER_DIR="/root/xiaotiao-main"

# 自动获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

APP_DIR="$PROJECT_DIR/xiaotiao-app"
SERVER_CODE="$PROJECT_DIR/xiaotiao-server"
TARGET="$SERVER_USER@$SERVER_IP"

MODE="${1:-frontend}"

echo "==========================================="
echo "  小挑 — 安全同步"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  模式: $MODE"
echo "==========================================="
echo ""
echo "⚠️  安全保护: 不会触碰服务器上的 .env / 数据库 / venv / uploads"
echo ""

sync_frontend() {
    echo "[前端] 同步 dist/ 到服务器..."

    if [ ! -d "$APP_DIR/dist" ]; then
        echo "  ❌ dist/ 目录不存在，请先运行: cd xiaotiao-app && npm run build"
        exit 1
    fi

    # 前端 dist 是完整构建产物，可以安全使用 --delete
    rsync -avz --delete \
        "$APP_DIR/dist/" \
        "$TARGET:$SERVER_DIR/xiaotiao-app/dist/"

    echo "  ✅ 前端同步完成"
}

sync_backend() {
    echo "[后端] 同步代码文件到服务器..."
    echo "  (仅同步 .py .j2 .sql .txt .md 文件，不使用 --delete)"

    # 只同步代码文件，绝不 --delete，绝不碰 .env / db / .venv / uploads
    rsync -avz \
        --include='*.py' \
        --include='*.j2' \
        --include='*.sql' \
        --include='requirements.txt' \
        --include='*/' \
        --exclude='*' \
        --exclude='.env' \
        --exclude='.venv/' \
        --exclude='venv/' \
        --exclude='db/*.db' \
        --exclude='db/*.db-journal' \
        --exclude='db/*.db-shm' \
        --exclude='db/*.db-wal' \
        --exclude='uploads/' \
        --exclude='__pycache__/' \
        "$SERVER_CODE/" \
        "$TARGET:$SERVER_DIR/xiaotiao-server/"

    echo "  ✅ 后端代码同步完成"
    echo ""
    echo "[后端] 重启服务..."
    ssh "$TARGET" "systemctl restart xiaotiao && sleep 1 && systemctl is-active xiaotiao && echo '  ✅ 服务已重启' || echo '  ⚠️ 重启失败，请运行: journalctl -u xiaotiao -n 20'"
}

case "$MODE" in
    frontend|front|f|"")
        sync_frontend
        ;;
    backend|back|b)
        sync_backend
        ;;
    all|a)
        sync_frontend
        sync_backend
        ;;
    *)
        echo "❌ 未知模式: $MODE"
        echo ""
        echo "用法:"
        echo "  bash deploy/sync.sh           # 同步前端 (默认)"
        echo "  bash deploy/sync.sh frontend  # 同步前端"
        echo "  bash deploy/sync.sh backend   # 同步后端代码"
        echo "  bash deploy/sync.sh all       # 全部同步"
        exit 1
        ;;
esac

echo ""
echo "==========================================="
echo "  ✅ 同步完成！"
echo "==========================================="
