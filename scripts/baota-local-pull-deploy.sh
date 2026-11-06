#!/usr/bin/env bash
# 宝塔本机自动部署：拉取 master → 构建 → rsync 到网站目录。
# 不依赖 GitHub Actions self-hosted runner 接单。
#
# 推荐计划任务（北京时间 07:25，紧接 07:00 的 daily-news 触发）：
#   /bin/bash /root/scripts/penn-notes-local-pull-deploy.sh
#
# 环境变量（可选）：
#   DEPLOY_PATH          网站根目录，默认 /www/wwwroot/penn-notes
#   PENN_NOTES_BUILD_DIR 构建工作目录，默认 /opt/penn-notes-build
#   PENN_NOTES_REPO_URL  git 地址（默认走 ghfast 镜像）
set -euo pipefail

SITE="${DEPLOY_PATH:-/www/wwwroot/penn-notes}"
WORK="${PENN_NOTES_BUILD_DIR:-/opt/penn-notes-build}"
REPO_URL="${PENN_NOTES_REPO_URL:-https://ghfast.top/https://github.com/lp-Imagine/penn-notes.git}"
LOG_FILE="${PENN_NOTES_DEPLOY_LOG:-/var/log/penn-notes-local-deploy.log}"
REF="${GITHUB_REF:-master}"

log() {
  echo "[$(TZ=Asia/Shanghai date '+%F %T')] $*" | tee -a "$LOG_FILE"
}

mkdir -p "$(dirname "$LOG_FILE")" "$SITE" "$(dirname "$WORK")"

log "start deploy SITE=$SITE WORK=$WORK"

if [ ! -d "$WORK/.git" ]; then
  log "clone $REPO_URL -> $WORK"
  rm -rf "$WORK"
  if ! git clone --depth 1 --branch "$REF" "$REPO_URL" "$WORK"; then
    log "mirror clone failed, fallback to github.com"
    git clone --depth 1 --branch "$REF" \
      "https://github.com/lp-Imagine/penn-notes.git" "$WORK"
  fi
else
  log "fetch/reset $REF"
  cd "$WORK"
  git remote set-url origin "$REPO_URL" 2>/dev/null || true
  if ! git fetch --depth 1 origin "$REF"; then
    git remote set-url origin "https://github.com/lp-Imagine/penn-notes.git"
    git fetch --depth 1 origin "$REF"
  fi
  git checkout -B "$REF" "origin/$REF"
  git reset --hard "origin/$REF"
  git clean -fd
fi

cd "$WORK"
log "commit $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

npm config set registry https://registry.npmmirror.com
npm ci
PENN_BASE=/ npm run build

export DEPLOY_MODE=local
export DEPLOY_PATH="$SITE"
bash scripts/ci-rsync-dist.sh

log "deploy-ok $(git rev-parse --short HEAD) -> $SITE"
