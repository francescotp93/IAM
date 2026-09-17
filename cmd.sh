#!/bin/bash
cd /opt/withus-backend && git log --oneline -1 && git status --short | head -5
echo "--- iam/index.html funzioni PR 2:"; grep -c "righeUtenti\|apriPermessiUtente\|mandaLinkPassword\|pu-comp-lista" iam/index.html
echo "--- utenti-albero:"; grep -c 'id="utenti-albero"' iam/index.html
echo "--- servito da Caddy:"; curl -s -o /dev/null -w "%{http_code} %{size_download}\n" https://iam.withusassicurazioni.it/index.html
curl -s https://iam.withusassicurazioni.it/index.html | md5sum; md5sum iam/index.html
