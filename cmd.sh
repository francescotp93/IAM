echo "== commit vivo sul VPS =="
git -C /opt/withus-backend rev-parse --short HEAD
git -C /opt/withus-backend log -1 --pretty='%s'
echo
echo "== versione annotata nei due documenti =="
grep -o 'app-versione[^>]*' /opt/withus-backend/iam/index.html | head -2
grep -o 'app-versione[^>]*' /opt/withus-backend/index.html | head -2
echo
echo "== versione.json servito =="
head -c 160 /opt/withus-backend/versione.json
echo
echo "== il grafico c'e'? =="
grep -c 'vol-svg\|volHTML' /opt/withus-backend/iam/index.html
echo
echo "== IAM risponde dal vivo =="
curl -s -o /dev/null -w '%{http_code}\n' https://iam.withusassicurazioni.it/
curl -s https://iam.withusassicurazioni.it/ | grep -o 'app-versione[^>]*' | head -2
