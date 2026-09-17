#!/bin/bash
cd /opt/withus-backend
for i in $(seq 1 20); do [ "$(git rev-parse --short HEAD)" = "988e607" ] && break; sleep 10; done
git log --oneline -1
echo "--- server/utenti.js presente:"; ls -la server/utenti.js | awk '{print $5, $9}'
echo "--- backend attivo da:"; systemctl show withus-backend -p ActiveEnterTimestamp --value
sleep 8
echo "--- POST /utenti/attiva senza token (atteso 401 JSON):"; curl -s -o - -w " [%{http_code}]\n" -X POST -H 'content-type: application/json' -d '{}' https://api.withusassicurazioni.it/utenti/attiva
echo "--- iam/index.html PR 3:"; grep -c "attivaAccessoPersona\|pu-ruolo-nuovo" iam/index.html; grep -c "nu-pass" iam/index.html
echo "--- index.html PR 3:"; grep -c "awCompagniaConsentita" index.html
echo "--- Caddy iam md5:"; curl -s https://iam.withusassicurazioni.it/index.html | md5sum; md5sum iam/index.html
echo "--- Caddy nuovo-preventivo md5:"; curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/index.html | md5sum; md5sum index.html
echo "--- journal backend (ultime 6 righe):"; journalctl -u withus-backend -n 6 --no-pager -o cat
