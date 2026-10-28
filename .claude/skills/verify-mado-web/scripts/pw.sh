#!/usr/bin/env bash
# playwright-cli on this skill's browser session. Usage: pw.sh <playwright-cli args...>
# It runs inside $STATE_DIR/pw, because playwright-cli writes its snapshot and console files into the current directory and reads files only from there.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

mkdir -p "$STATE_DIR/pw" "$EVIDENCE_DIR"
cd "$STATE_DIR/pw"
exec playwright-cli -s="$SESSION" "$@"
