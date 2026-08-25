#!/usr/bin/env bash
# Publish VitePress dist to Baota.
#
# DEPLOY_MODE=local  (default on self-hosted runner): rsync on the same machine
# DEPLOY_MODE=remote : pack + scp over SSH (legacy; slow from GH-hosted runners → CN)
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
MODE="${DEPLOY_MODE:-local}"
SITE="${DEPLOY_PATH%/}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/website/.vitepress/dist"
if [ ! -d "$DIST" ]; then
  echo "ci-rsync-dist: missing $DIST" >&2
  exit 1
fi

deploy_local() {
  if ! command -v rsync >/dev/null 2>&1; then
    echo "ci-rsync-dist: rsync is required for local deploy" >&2
    exit 1
  fi

  NEW="${SITE}.new.$$"
  echo "ci-rsync-dist: local sync $DIST -> $SITE"
  rm -rf "$NEW"
  mkdir -p "$NEW" "$SITE"
  rsync -a "$DIST"/ "$NEW"/
  if [ -f "$SITE/.user.ini" ]; then
    cp -a "$SITE/.user.ini" "$NEW/.user.ini" || true
  fi
  rsync -a --delete --exclude '.user.ini' "$NEW"/ "$SITE"/
  rm -rf "$NEW"
  echo "ci-rsync-dist: deploy-ok (local)"
  ls -la "$SITE" | head -n 8
}

deploy_remote() {
  : "${DEPLOY_HOST:?DEPLOY_HOST is required for remote mode}"
  : "${DEPLOY_USER:?DEPLOY_USER is required for remote mode}"
  : "${DEPLOY_SSH_KEY:?DEPLOY_SSH_KEY is required for remote mode}"
  PORT="${DEPLOY_PORT:-22}"
  # Hard cap so a stalled CN hop fails the job instead of hanging forever.
  DEPLOY_TIMEOUT_SEC="${DEPLOY_TIMEOUT_SEC:-1200}"

  KEY_FILE="$(mktemp)"
  ARCHIVE="$(mktemp -t penn-dist.XXXXXX).tgz"
  cleanup() { rm -f "$KEY_FILE" "$ARCHIVE"; }
  trap cleanup EXIT
  umask 077

  python3 - "$KEY_FILE" <<'PY'
import os, sys
from pathlib import Path
key = os.environ["DEPLOY_SSH_KEY"].replace("\r\n", "\n").replace("\r", "\n")
if "\n" not in key.strip() and "\\n" in key:
    key = key.replace("\\n", "\n")
if not key.endswith("\n"):
    key += "\n"
Path(sys.argv[1]).write_text(key)
PY
  chmod 600 "$KEY_FILE"

  SSH_CMD=(
    ssh
    -i "$KEY_FILE"
    -p "$PORT"
    -o IdentitiesOnly=yes
    -o BatchMode=yes
    -o StrictHostKeyChecking=accept-new
    -o ConnectTimeout=20
    -o ServerAliveInterval=15
    -o ServerAliveCountMax=6
  )
  SCP_CMD=(
    scp
    -i "$KEY_FILE"
    -P "$PORT"
    -o IdentitiesOnly=yes
    -o BatchMode=yes
    -o StrictHostKeyChecking=accept-new
    -o ConnectTimeout=20
    -o ServerAliveInterval=15
    -o ServerAliveCountMax=6
  )

  echo "ci-rsync-dist: packing $DIST"
  tar -C "$DIST" -czf "$ARCHIVE" .
  SIZE="$(du -h "$ARCHIVE" | awk '{print $1}')"
  BYTES="$(wc -c <"$ARCHIVE" | tr -d ' ')"
  echo "ci-rsync-dist: archive $SIZE ($BYTES bytes) -> ${DEPLOY_USER}@${DEPLOY_HOST}:${SITE} (port $PORT, timeout ${DEPLOY_TIMEOUT_SEC}s)"

  "${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p '$SITE' /tmp && echo ok"

  REMOTE_TGZ="/tmp/penn-notes-dist-$$.tgz"
  echo "ci-rsync-dist: uploading…"
  timeout --signal=TERM --kill-after=30s "$DEPLOY_TIMEOUT_SEC" \
    "${SCP_CMD[@]}" "$ARCHIVE" "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_TGZ}"
  echo "ci-rsync-dist: upload done, extracting on server…"

  timeout --signal=TERM --kill-after=30s 120 \
    "${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "set -euo pipefail
     SITE='$SITE'
     TGZ='$REMOTE_TGZ'
     NEW=\"\${SITE}.new\"
     rm -rf \"\$NEW\"
     mkdir -p \"\$NEW\"
     tar -xzf \"\$TGZ\" -C \"\$NEW\"
     rm -f \"\$TGZ\"
     if [ -f \"\$SITE/.user.ini\" ]; then
       cp -a \"\$SITE/.user.ini\" \"\$NEW/.user.ini\" || true
     fi
     rsync -a --delete --exclude '.user.ini' \"\$NEW\"/ \"\$SITE\"/
     rm -rf \"\$NEW\"
     echo deploy-ok
     ls -la \"\$SITE\" | head -n 8
    "
}

case "$MODE" in
  local) deploy_local ;;
  remote) deploy_remote ;;
  *)
    echo "ci-rsync-dist: unknown DEPLOY_MODE=$MODE (use local|remote)" >&2
    exit 1
    ;;
esac

echo "ci-rsync-dist: done"
