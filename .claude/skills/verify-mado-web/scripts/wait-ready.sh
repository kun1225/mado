#!/usr/bin/env bash
# Waits until React has hydrated the open page. Run it after every open, goto and reload, before any click or file upload.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

# The server renders the whole page, so buttons and inputs are visible long before their handlers exist.
# A file set on the input before hydration is lost, and React then ignores the same files if they are set again, so reload instead of retrying.
"$SKILL_SCRIPTS_DIR/pw.sh" --raw run-code "async page => {
  await page.waitForFunction(() => {
    const input = document.querySelector('input[type=file]');
    return input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
  }, null, { timeout: 60000 });
  return 'hydrated';
}"
