#!/usr/bin/env bash
# Trigger Daily AI News workflow via GitHub API (workflow_dispatch).
#
# Usage:
#   GITHUB_TOKEN=ghp_xxx bash scripts/trigger-daily-news.sh
#   GITHUB_TOKEN=ghp_xxx NEWS_DATE=2026-08-26 bash scripts/trigger-daily-news.sh
#   GITHUB_TOKEN=ghp_xxx bash scripts/trigger-daily-news.sh --date=2026-08-26 --force
#
# PAT 需 repo + workflow 权限（或 classic PAT 勾选 repo）。
set -euo pipefail

: "${GITHUB_TOKEN:?Set GITHUB_TOKEN (PAT with repo/workflow scope)}"
REPO="${GITHUB_REPO:-lp-Imagine/penn-notes}"
REF="${GITHUB_REF:-master}"

NEWS_DATE="${NEWS_DATE:-}"
FORCE="${FORCE:-false}"

for arg in "$@"; do
  case "$arg" in
    --date=*) NEWS_DATE="${arg#--date=}" ;;
    --force) FORCE="true" ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

if [ -n "$NEWS_DATE" ] && ! [[ "$NEWS_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Invalid NEWS_DATE: $NEWS_DATE (expected YYYY-MM-DD)" >&2
  exit 1
fi

# 构建 inputs JSON（空 inputs 时 GitHub 会用 workflow 默认值）
inputs_json="{}"
if [ -n "$NEWS_DATE" ]; then
  inputs_json=$(node -e "console.log(JSON.stringify({ ...JSON.parse(process.argv[1]), date: process.argv[2] }))" "$inputs_json" "$NEWS_DATE")
fi
if [ "$FORCE" = "true" ]; then
  inputs_json=$(node -e "console.log(JSON.stringify({ ...JSON.parse(process.argv[1]), force: 'true' }))" "$inputs_json")
fi

body=$(node -e "console.log(JSON.stringify({ ref: process.argv[1], inputs: JSON.parse(process.argv[2]) }))" "$REF" "$inputs_json")

response=$(curl -sS -w "\n%{http_code}" -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/actions/workflows/daily-news.yml/dispatches" \
  -d "$body")

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$http_code" != "204" ]; then
  echo "Failed to trigger daily-news (HTTP ${http_code})" >&2
  [ -n "$response_body" ] && echo "$response_body" >&2
  exit 1
fi

echo "Triggered daily-news on ${REPO}@${REF}"
[ -n "$NEWS_DATE" ] && echo "  date=${NEWS_DATE}"
[ "$FORCE" = "true" ] && echo "  force=true"
