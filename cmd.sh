cd /opt/withus-backend
echo "=== commit ==="; git log --oneline -1
echo "=== il file su disco contiene il pannello? ==="
grep -c 'id="panel-conti"' iam/index.html
grep -o 'withus-one.js?v=[0-9a-z]*' iam/index.html | head -1
echo "=== header della pagina IAM, dal server stesso ==="
curl -sS -I -H 'Host: iam.withusassicurazioni.it' https://127.0.0.1/ --insecure 2>&1 | head -20
echo "=== la pagina SERVITA porta il pannello? ==="
curl -sS -H 'Host: iam.withusassicurazioni.it' https://127.0.0.1/ --insecure 2>/dev/null | grep -c 'panel-conti'
echo "=== la scocca servita ha la voce? ==="
curl -sS -H 'Host: iam.withusassicurazioni.it' https://127.0.0.1/withus-one.js --insecure 2>/dev/null | grep -c 'Conti e causali'
