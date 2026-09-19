U=https://iam.withusassicurazioni.it
R="--resolve iam.withusassicurazioni.it:443:127.0.0.1"
echo "=== header della pagina IAM ==="
curl -sSk $R -I $U/ 2>&1 | head -18
echo "=== la pagina SERVITA porta il pannello? (atteso 1) ==="
curl -sSk $R $U/ 2>/dev/null | grep -c 'panel-conti'
echo "=== quale versione di scocca chiede la pagina servita? ==="
curl -sSk $R $U/ 2>/dev/null | grep -o 'withus-one.js?v=[0-9a-z]*' | head -1
echo "=== la scocca servita ha la voce? (atteso 1+) ==="
curl -sSk $R "$U/withus-one.js?v=20260919a" 2>/dev/null | grep -c 'Conti e causali'
echo "=== header della scocca ==="
curl -sSk $R -I "$U/withus-one.js?v=20260919a" 2>&1 | head -12
