U=https://iam.withusassicurazioni.it
R="--resolve iam.withusassicurazioni.it:443:127.0.0.1"
cd /opt/withus-backend
echo "=== commit ==="; git log --oneline -1
echo "=== versione.json servito ==="
curl -sSk $R $U/versione.json 2>/dev/null | head -4
echo "=== versione annotata: IAM ==="
curl -sSk $R $U/ 2>/dev/null | grep -o 'name="app-versione[^>]*content="[^"]*"' | head -2
echo "=== versione annotata: preventivatore ==="
curl -sSk $R $U/nuovo-preventivo/ 2>/dev/null | grep -o 'name="app-versione[^>]*content="[^"]*"' | head -2
