#!/bin/bash
cd /opt/withus-backend
for i in $(seq 1 20); do [ "$(git rev-parse --short HEAD)" = "120c63e" ] && break; sleep 10; done
git log --oneline -1
echo "--- QUOTO ospite:"; grep -c "autoRefreshToken: false } } : undefined" index.html; grep -c "persistSession: false" index.html
echo "--- scocca:"; grep -c "QUOTO_ORIGIN === location.origin) return Promise.resolve({})" iam/withus-one.js; grep -o "withus-one.js?v=[0-9a-z]*" iam/index.html
echo "--- quotoUrl:"; grep -c "return QUOTO_URL + '?from=iam';" iam/index.html; grep -c "#at=" iam/index.html
echo "--- Caddy md5 (iam, scocca, nuovo-preventivo):"
curl -s https://iam.withusassicurazioni.it/index.html | md5sum | cut -c1-8; md5sum iam/index.html | cut -c1-8
curl -s "https://iam.withusassicurazioni.it/withus-one.js?v=20260917d" | md5sum | cut -c1-8; md5sum iam/withus-one.js | cut -c1-8
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/index.html | md5sum | cut -c1-8; md5sum index.html | cut -c1-8
