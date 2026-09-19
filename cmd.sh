U=https://iam.withusassicurazioni.it
R="--resolve iam.withusassicurazioni.it:443:127.0.0.1"
cd /opt/withus-backend
echo "=== commit ==="; git log --oneline -1
echo "=== versione.json servito ==="
curl -sSk $R $U/versione.json 2>/dev/null | head -5
echo "=== la versione annotata nelle due pagine servite ==="
curl -sSk $R $U/ 2>/dev/null | grep -o 'name="app-versione[^>]*' | head -2
curl -sSk $R $U/nuovo-preventivo/ 2>/dev/null | grep -o 'name="app-versione[^>]*' | head -2
