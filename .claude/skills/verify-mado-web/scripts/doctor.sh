#!/usr/bin/env bash
# Read-only. Exit 0 only when the instance on $PORT is ours, from this checkout, and serving the app.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

fail=0
check() { # check <label> <command...>
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then echo "ok    $label"; else echo "FAIL  $label"; fail=1; fi
}

owner="$(port_owner)"
recorded="$(cat "$PID_FILE" 2>/dev/null || true)"

check "something listens on port $PORT" test -n "$owner"
check "the listener is the pid this skill recorded ($recorded)" test -n "$owner" -a "$owner" = "$recorded"
check "its working directory is this checkout's apps/web" \
  bash -c "test -n '$owner' && lsof -p '$owner' 2>/dev/null | grep -F ' cwd ' | grep -qF '$WEB_DIR'"
check "GET /library answers 200" \
  bash -c "[[ \"\$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 '$BASE_URL/library')\" == 200 ]]"
check "the page is the app (title contains Mado)" \
  bash -c "curl -s --max-time 10 '$BASE_URL/library' | grep -qi '<title>[^<]*mado'"
check "guest mode: the dev auth bypass is on" grep -q '^VITE_DEV_AUTH_BYPASS=true' "$WEB_DIR/.env"

if playwright-cli list 2>/dev/null | grep -q "$SESSION"; then
  echo "info  browser session '$SESSION' is open"
else
  echo "info  no browser session '$SESSION' yet"
fi

exit "$fail"
