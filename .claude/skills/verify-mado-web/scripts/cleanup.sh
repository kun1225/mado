#!/usr/bin/env bash
# Stops what this skill started: the browser session and the dev server in the pid file. Keeps $EVIDENCE_DIR.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

playwright-cli -s="$SESSION" close >/dev/null 2>&1 || true

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
  # The pid file can outlive the process and the number can be reused, so only stop a Vite from this checkout.
  if ps -o command= -p "$pid" | grep -qF "vite.js dev --port $PORT --strictPort"; then
    kill "$pid"
    echo "stopped dev server pid $pid"
  else
    echo "pid $pid in $PID_FILE is not our Vite, left alone" >&2
  fi
fi
rm -f "$PID_FILE"

echo "evidence kept in $EVIDENCE_DIR"
