cd /opt/withus-backend
for i in $(seq 1 16); do
  if grep -q 'app-versione" content="0.3.0"' iam/index.html 2>/dev/null; then break; fi
  sleep 10
done
echo "atteso: $((i*10))s"
git log --oneline -1
echo "--- meta ---"
grep -o '<meta name="app-versione[^>]*>' iam/index.html | head -2
echo "--- linguette nuove ---"
grep -c 'id="ctab-primanota"\|id="ctab-conti"' iam/index.html
echo "--- servito da Caddy ---"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o '<meta name="app-versione[^>]*>' | head -2
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -c 120; echo
curl -s -o /dev/null -w "versione.json: %{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json
