#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/setup_github.sh <repo-name> [public|private] [owner]"
  echo "Example: ./scripts/setup_github.sh xiaotiao private"
  exit 1
fi

REPO_NAME="$1"
VISIBILITY="${2:-private}"
OWNER="${3:-}"

if [[ "$VISIBILITY" != "public" && "$VISIBILITY" != "private" ]]; then
  echo "Error: visibility must be 'public' or 'private'."
  exit 1
fi

cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: current directory is not a git repository."
  exit 1
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "No commit found. Creating initial commit..."
  git add .
  git commit -m "chore: initial project setup for collaboration"
fi

if command -v gh >/dev/null 2>&1; then
  REPO_REF="$REPO_NAME"
  if [[ -n "$OWNER" ]]; then
    REPO_REF="$OWNER/$REPO_NAME"
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "GitHub CLI detected but not authenticated. Please run: gh auth login"
    exit 1
  fi

  echo "Creating GitHub repository: $REPO_REF ($VISIBILITY)"
  gh repo create "$REPO_REF" --"$VISIBILITY" --source . --remote origin --push
  echo "Done. Remote repository is ready and main has been pushed."
  exit 0
fi

echo "gh CLI is not installed. Falling back to manual mode."
echo "1) Create repository '$REPO_NAME' on GitHub website first."
echo "2) Then run the following commands:"
echo ""
echo "   git remote add origin https://github.com/<your-username>/$REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
