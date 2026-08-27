#!/usr/bin/env bash
# 宝塔计划任务：每天 07:00 触发 GitHub Actions Daily AI News。
# 仅发 workflow_dispatch；生成、gh-pages 与主站部署均在 Actions 内完成。
#
# 一次性安装（在宝塔 SSH）：
#   mkdir -p /root/.config/penn-notes
#   echo 'ghp_xxx' > /root/.config/penn-notes/github_token
#   chmod 600 /root/.config/penn-notes/github_token
#   curl -fsSL -o /root/scripts/penn-notes-cron-daily-news.sh \
#     https://raw.githubusercontent.com/lp-Imagine/penn-notes/master/scripts/baota-cron-daily-news.sh
#   chmod +x /root/scripts/penn-notes-cron-daily-news.sh
#
# 宝塔 → 计划任务 → Shell → 每天 07:00：
#   /bin/bash /root/scripts/penn-notes-cron-daily-news.sh
#
# 补跑指定日期（SSH 手动）：
#   NEWS_DATE=2026-08-26 /bin/bash /root/scripts/penn-notes-cron-daily-news.sh
set -euo pipefail

TOKEN_FILE="${PENN_NOTES_GITHUB_TOKEN_FILE:-/root/.config/penn-notes/github_token}"
LOG_FILE="${PENN_NOTES_CRON_LOG:-/var/log/penn-notes-daily-news-cron.log}"
REPO="${GITHUB_REPO:-lp-Imagine/penn-notes}"
REF="${GITHUB_REF:-master}"
NEWS_DATE="${NEWS_DATE:-}"
FORCE="${FORCE:-false}"

log() {
  echo "[$(TZ=Asia/Shanghai date '+%F %T')] $*" | tee -a "$LOG_FILE"
}

if [ ! -f "$TOKEN_FILE" ]; then
  log "ERROR: token file missing: $TOKEN_FILE"
  exit 1
fi

GITHUB_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
if [ -z "$GITHUB_TOKEN" ]; then
  log "ERROR: empty token in $TOKEN_FILE"
  exit 1
fi

if [ -n "$NEWS_DATE" ] && ! [[ "$NEWS_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  log "ERROR: invalid NEWS_DATE=$NEWS_DATE"
  exit 1
fi

inputs_json="{}"
if [ -n "$NEWS_DATE" ]; then
  inputs_json="{\"date\":\"${NEWS_DATE}\"}"
fi
if [ "$FORCE" = "true" ]; then
  if [ "$inputs_json" = "{}" ]; then
    inputs_json='{"force":"true"}'
  else
    inputs_json="{\"date\":\"${NEWS_DATE}\",\"force\":\"true\"}"
  fi
fi

body="{\"ref\":\"${REF}\",\"inputs\":${inputs_json}}"

response=$(curl -sS -w "\n%{http_code}" -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/actions/workflows/daily-news.yml/dispatches" \
  -d "$body")

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$http_code" != "204" ]; then
  log "ERROR: trigger failed HTTP ${http_code} ${response_body}"
  exit 1
fi

log "OK triggered daily-news ${REPO}@${REF}${NEWS_DATE:+ date=${NEWS_DATE}}${FORCE:+ force=true}"
