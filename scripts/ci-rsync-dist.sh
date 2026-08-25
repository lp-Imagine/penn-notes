#!/usr/bin/env bash
# Sync VitePress dist to Baota. Requires DEPLOY_HOST / DEPLOY_USER / DEPLOY_SSH_KEY / DEPLOY_PATH.
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

DEST="${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH%/}/"
echo "ci-rsync-dist: $DIST/ -> $DEST (port $PORT)"

rsync -az --delete \
  -e "ssh -i $KEY_FILE -p $PORT -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
  --exclude '.user.ini' \
  "$DIST"/ \
  "$DEST"
