#!/bin/bash
cd /opt/withus-backend
git log --oneline -1
echo "--- servizio backend:"; systemctl is-active withus-backend; systemctl show withus-backend -p ActiveEnterTimestamp --value
echo "--- rotta utenti:"; curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'content-type: application/json' -d '{}' https://api.withusassicurazioni.it/utenti/attiva
echo "--- md5 serviti vs repo:"
for f in index.html withus-one.js nuovo-preventivo/index.html; do
  case $f in nuovo-preventivo/index.html) loc=index.html;; *) loc=iam/$f;; esac
  a=$(curl -s "https://iam.withusassicurazioni.it/$f" | md5sum | cut -c1-8); b=$(md5sum $loc | cut -c1-8); echo "$f servito=$a repo=$b $([ "$a" = "$b" ] && echo OK || echo DIVERSO)"
done
