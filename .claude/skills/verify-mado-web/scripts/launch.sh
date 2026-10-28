#!/usr/bin/env bash
# Starts a dev server of the web app on $PORT, owned by this skill. Exits 0 when the app is usable.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

mkdir -p "$STATE_DIR" "$EVIDENCE_DIR"

owner="$(port_owner)"
if [[ -n "$owner" ]]; then
  if [[ -f "$PID_FILE" && "$(cat "$PID_FILE")" == "$owner" ]]; then
    echo "already running: pid $owner on $BASE_URL"
    exit 0
  fi
  # Driving a server we did not start could corrupt someone else's session.
  echo "port $PORT is owned by pid $owner, which this skill did not start. Set MADO_VERIFY_PORT to a free port." >&2
  exit 1
fi

# --strictPort: Vite would otherwise move to the next port and the doctor would look at the wrong one.
cd "$WEB_DIR"
nohup node node_modules/vite/bin/vite.js dev --port "$PORT" --strictPort >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

# Vite compiles on the first request, so the first answer is slow.
for _ in $(seq 1 90); do
  if [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE_URL/library" || true)" == "200" ]]; then
    echo "ready: pid $(cat "$PID_FILE") on $BASE_URL"
    exit 0
  fi
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "the dev server exited. Log:" >&2
    tail -n 30 "$LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done

echo "the dev server did not answer in 90s. Log:" >&2
tail -n 30 "$LOG_FILE" >&2
exit 1
