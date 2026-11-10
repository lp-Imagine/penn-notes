#!/usr/bin/env bash
# 宝塔计划任务：每天 07:00 触发 Daily AI News，等 generate 成功后本机部署主站。
# 主站不依赖 self-hosted runner 接单（Idle 却 Waiting 时仍能更新）。
#
# 一次性安装（在宝塔 SSH）：
#   mkdir -p /root/.config/penn-notes /root/scripts /var/log
#   echo 'ghp_xxx' > /root/.config/penn-notes/github_token
#   chmod 600 /root/.config/penn-notes/github_token
#   curl -fsSL -o /root/scripts/penn-notes-cron-daily-news.sh \
#     https://raw.githubusercontent.com/lp-Imagine/penn-notes/master/scripts/baota-cron-daily-news.sh
#   curl -fsSL -o /root/scripts/penn-notes-local-pull-deploy.sh \
#     https://raw.githubusercontent.com/lp-Imagine/penn-notes/master/scripts/baota-local-pull-deploy.sh
#   chmod +x /root/scripts/penn-notes-cron-daily-news.sh \
#     /root/scripts/penn-notes-local-pull-deploy.sh
#
# 宝塔 → 计划任务 → Shell → 每天 07:00：
#   /bin/bash /root/scripts/penn-notes-cron-daily-news.sh
#
# 补跑指定日期（SSH 手动）：
#   NEWS_DATE=2026-08-26 /bin/bash /root/scripts/penn-notes-cron-daily-news.sh
#
# 环境变量（可选）：
#   SKIP_LOCAL_DEPLOY=true     只触发 Actions，不本机部署
#   GENERATE_WAIT_SECS=3600    等 generate 的最长秒数（默认 60 分钟）
#   GENERATE_POLL_SECS=30      轮询间隔
#   LOCAL_DEPLOY_SCRIPT=...    本机部署脚本路径
set -euo pipefail

TOKEN_FILE="${PENN_NOTES_GITHUB_TOKEN_FILE:-/root/.config/penn-notes/github_token}"
LOG_FILE="${PENN_NOTES_CRON_LOG:-/var/log/penn-notes-daily-news-cron.log}"
REPO="${GITHUB_REPO:-lp-Imagine/penn-notes}"
REF="${GITHUB_REF:-master}"
NEWS_DATE="${NEWS_DATE:-}"
FORCE="${FORCE:-false}"
SKIP_LOCAL_DEPLOY="${SKIP_LOCAL_DEPLOY:-false}"
GENERATE_WAIT_SECS="${GENERATE_WAIT_SECS:-3600}"
GENERATE_POLL_SECS="${GENERATE_POLL_SECS:-30}"
LOCAL_DEPLOY_SCRIPT="${LOCAL_DEPLOY_SCRIPT:-/root/scripts/penn-notes-local-pull-deploy.sh}"
LOCAL_DEPLOY_URL="${LOCAL_DEPLOY_URL:-https://raw.githubusercontent.com/lp-Imagine/penn-notes/master/scripts/baota-local-pull-deploy.sh}"
API="https://api.github.com"

log() {
  echo "[$(TZ=Asia/Shanghai date '+%F %T')] $*" | tee -a "$LOG_FILE"
}

mkdir -p "$(dirname "$LOG_FILE")"

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

gh_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [ -n "$data" ]; then
    curl -sS -X "$method" \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      -d "$data" \
      "${API}${path}"
  else
    curl -sS -X "$method" \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "${API}${path}"
  fi
}

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
triggered_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

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

log "OK triggered daily-news ${REPO}@${REF}${NEWS_DATE:+ date=${NEWS_DATE}}${FORCE:+ force=${FORCE}}"

# workflow_dispatch 不返回 run id；短等后按 event+时间找最近一次 run
sleep 5
run_id=""
deadline=$(( $(date +%s) + 120 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  runs_json="$(gh_api GET "/repos/${REPO}/actions/workflows/daily-news.yml/runs?event=workflow_dispatch&per_page=5")"
  run_id="$(printf '%s' "$runs_json" | python3 -c "
import json, sys
from datetime import datetime, timezone
triggered = datetime.fromisoformat('${triggered_at}'.replace('Z', '+00:00'))
data = json.load(sys.stdin)
for run in data.get('workflow_runs', []):
    created = datetime.fromisoformat(run['created_at'].replace('Z', '+00:00'))
    if created >= triggered or (triggered - created).total_seconds() < 120:
        print(run['id'])
        break
" 2>/dev/null || true)"
  if [ -n "$run_id" ]; then
    break
  fi
  sleep 5
done

if [ -z "$run_id" ]; then
  log "ERROR: could not locate workflow run after dispatch"
  exit 1
fi
log "watching run ${run_id} for job generate (max ${GENERATE_WAIT_SECS}s)"

wait_deadline=$(( $(date +%s) + GENERATE_WAIT_SECS ))
generate_ok=0
while [ "$(date +%s)" -lt "$wait_deadline" ]; do
  jobs_json="$(gh_api GET "/repos/${REPO}/actions/runs/${run_id}/jobs?per_page=20")"
  eval "$(printf '%s' "$jobs_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for job in data.get('jobs', []):
    if job.get('name') == 'generate':
        print('job_status=' + repr(job.get('status') or ''))
        print('job_conclusion=' + repr(job.get('conclusion') or ''))
        break
else:
    print(\"job_status=''\")
    print(\"job_conclusion=''\")
" 2>/dev/null || echo "job_status=''; job_conclusion=''")"

  if [ "${job_status:-}" = "completed" ]; then
    if [ "${job_conclusion:-}" = "success" ]; then
      log "generate succeeded on run ${run_id}"
      generate_ok=1
      break
    fi
    log "ERROR: generate finished with conclusion=${job_conclusion:-unknown} (run ${run_id})"
    exit 1
  fi

  log "generate status=${job_status:-missing} — sleep ${GENERATE_POLL_SECS}s"
  sleep "$GENERATE_POLL_SECS"
done

if [ "$generate_ok" -ne 1 ]; then
  log "ERROR: timed out waiting for generate on run ${run_id}"
  exit 1
fi

if [ "$SKIP_LOCAL_DEPLOY" = "true" ]; then
  log "SKIP_LOCAL_DEPLOY=true — skip main site deploy"
  exit 0
fi

if [ ! -x "$LOCAL_DEPLOY_SCRIPT" ]; then
  log "local deploy script missing — downloading to ${LOCAL_DEPLOY_SCRIPT}"
  mkdir -p "$(dirname "$LOCAL_DEPLOY_SCRIPT")"
  curl -fsSL -o "$LOCAL_DEPLOY_SCRIPT" "$LOCAL_DEPLOY_URL"
  chmod +x "$LOCAL_DEPLOY_SCRIPT"
fi

log "starting local main-site deploy via ${LOCAL_DEPLOY_SCRIPT}"
if /bin/bash "$LOCAL_DEPLOY_SCRIPT"; then
  log "local main-site deploy OK"
else
  log "ERROR: local main-site deploy failed (see /var/log/penn-notes-local-deploy.log)"
  exit 1
fi
