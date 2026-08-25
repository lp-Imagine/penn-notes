#!/usr/bin/env bash
# Publish VitePress dist to Baota via tar-over-ssh (faster than many-file rsync
# from overseas runners). Unpack to a sibling dir, then sync into the live path
# while preserving Baota's locked .user.ini.
set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_SSH_KEY:?DEPLOY_SSH_KEY is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
PORT="${DEPLOY_PORT:-22}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/website/.vitepress/dist"
if [ ! -d "$DIST" ]; then
  echo "ci-rsync-dist: missing $DIST" >&2
  exit 1
fi

KEY_FILE="$(mktemp)"
cleanup() { rm -f "$KEY_FILE"; }
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

echo "ci-rsync-dist: packing $DIST -> ${DEPLOY_USER}@${DEPLOY_HOST}:${SITE} (port $PORT)"

BYTES="$(du -sb "$DIST" | awk '{print $1}')"
echo "ci-rsync-dist: dist size ${BYTES} bytes"

# Fail fast on auth / path problems before uploading.
"${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p '$SITE' && echo ok"

# Stream one archive (avoids per-file SSH round-trips that hang over CN links).
# Remote: extract to .new, rsync into live site, keep .user.ini, drop staging.
tar -C "$DIST" -czf - . | "${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "set -euo pipefail
   SITE='$SITE'
   NEW=\"\${SITE}.new\"
   rm -rf \"\$NEW\"
   mkdir -p \"\$NEW\"
   tar -xzf - -C \"\$NEW\"
   if [ -f \"\$SITE/.user.ini\" ]; then
     cp -a \"\$SITE/.user.ini\" \"\$NEW/.user.ini\" || true
   fi
   rsync -a --delete --exclude '.user.ini' \"\$NEW\"/ \"\$SITE\"/
   rm -rf \"\$NEW\"
   echo deploy-ok
   ls -la \"\$SITE\" | head -n 8
  "

echo "ci-rsync-dist: done"
