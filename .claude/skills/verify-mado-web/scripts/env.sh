# Sourced by the other scripts. Every value can be overridden from the environment.
SKILL_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SKILL_SCRIPTS_DIR/../../../.." && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"

# 3100 is the port of `pnpm dev`. A person may already be using it, so verification gets its own.
PORT="${MADO_VERIFY_PORT:-3199}"
BASE_URL="http://localhost:$PORT"
SESSION="${MADO_VERIFY_SESSION:-mado-verify}"

STATE_DIR="${MADO_VERIFY_DIR:-${TMPDIR:-/tmp}/mado-verify}"
# Inside pw/, because playwright-cli refuses to write files anywhere else.
EVIDENCE_DIR="$STATE_DIR/pw/evidence"
PID_FILE="$STATE_DIR/dev-server.pid"
LOG_FILE="$STATE_DIR/dev-server.log"

# Prints the pid that listens on $PORT, or nothing.
port_owner() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true
}
