#!/bin/bash
cd /opt/withus-backend
for i in $(seq 1 20); do [ "$(git rev-parse --short HEAD)" = "f187b56" ] && break; sleep 10; done
git log --oneline -1
echo "--- IAM modulo 3:"; grep -c "pt-produzione\|produzioneRiassunto\|kpi_produzione" iam/index.html; grep -o "withus-one.js?v=[0-9a-z]*" iam/index.html; grep -c "performance: 'performance'" iam/withus-one.js
echo "--- QUOTO:"; grep -c "apriPerformanceInIam" index.html; grep -c "apexcharts\|loadPerformance" index.html
echo "--- Caddy iam md5:"; curl -s https://iam.withusassicurazioni.it/index.html | md5sum; md5sum iam/index.html
echo "--- Caddy scocca md5:"; curl -s "https://iam.withusassicurazioni.it/withus-one.js?v=20260917c" | md5sum; md5sum iam/withus-one.js
echo "--- Caddy nuovo-preventivo md5:"; curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/index.html | md5sum; md5sum index.html
