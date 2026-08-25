#!/usr/bin/env bash
# Publish VitePress dist to Baota.
# Pack locally, then scp one archive (clearer than a silent tar pipe over CN links).
set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_SSH_KEY:?DEPLOY_SSH_KEY is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
PORT="${DEPLOY_PORT:-22}"
# Hard cap so a stalled CN hop fails the job instead of hanging forever.
DEPLOY_TIMEOUT_SEC="${DEPLOY_TIMEOUT_SEC:-480}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/website/.vitepress/dist"
if [ ! -d "$DIST" ]; then
  echo "ci-rsync-dist: missing $DIST" >&2
  exit 1
fi

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

SITE="${DEPLOY_PATH%/}"
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
# timeout(1) is on ubuntu-latest; kill hung scp/ssh to China.
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

echo "ci-rsync-dist: done"
