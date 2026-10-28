#!/usr/bin/env bash
# Prints the guest library as JSON: IndexedDB records and OPFS files. Needs an open page on $BASE_URL. Reads only.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

# The code goes inline: playwright-cli refuses --filename paths outside its working directory.
"$SKILL_SCRIPTS_DIR/pw.sh" --raw run-code "$(cat "$SKILL_SCRIPTS_DIR/dump-state.js")"
