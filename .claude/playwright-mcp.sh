#!/bin/sh
# Avvia Playwright MCP: il browser che Claude comanda (apre pagine, clicca,
# compila, fa screenshot). Nel cloud usa il Chromium preinstallato in
# /opt/pw-browsers, senza finestra; sul PC usa il browser di sistema.
# Le catture finiscono fuori dal repo.
out="${TMPDIR:-/tmp}/playwright-mcp"
if [ -x /opt/pw-browsers/chromium ]; then
  set -- --browser chromium --executable-path /opt/pw-browsers/chromium --headless "$@"
fi
exec npx -y @playwright/mcp@0.0.83 --isolated --output-dir "$out" "$@"
