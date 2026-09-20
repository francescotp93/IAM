cd /opt/withus-backend
git log --oneline -1
echo "--- meta IAM ---"
grep -o '<meta name="app-versione[^>]*>' iam/index.html | head -4
echo "--- meta QUOTO ---"
grep -o '<meta name="app-versione[^>]*>' index.html | head -4
echo "--- motore provvigioni sul disco ---"
ls -l tariffe/motore/provvigioni.js
echo "--- voci di menu nella scocca ---"
grep -c "act: 'compagnie'\|act: 'provvigioni'" iam/withus-one.js
echo "--- servito da Caddy ---"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o '<meta name="app-versione[^>]*>' | head -2
curl -s -o /dev/null -w "provvigioni.js: %{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/provvigioni.js
