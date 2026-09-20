cd /opt/withus-backend
for i in $(seq 1 14); do
  if [ -f tariffe/motore/provvigioni.js ]; then break; fi
  sleep 10
done
echo "atteso: $((i*10))s"
git log --oneline -1
echo "--- meta IAM / QUOTO ---"
grep -o '<meta name="app-versione[^>]*>' iam/index.html | head -2
grep -o '<meta name="app-versione[^>]*>' index.html | head -2
echo "--- voci di menu nella scocca ---"
grep -c "act: 'compagnie'\|act: 'provvigioni'" iam/withus-one.js
echo "--- servito da Caddy ---"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o '<meta name="app-versione[^>]*>' | head -2
curl -s -o /dev/null -w "provvigioni.js: %{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/provvigioni.js
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -c 'id="panel-compagnie"\|id="panel-provvigioni"'
