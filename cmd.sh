echo "== commit vivo"
git -C /opt/withus-backend log --oneline -1
echo "== IAM servito"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o 'name="app-versione[^>]*>'
echo "== il motore del catalogo e' raggiungibile"
curl -sI --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/catalogo.js | head -1
echo "== la voce di menu c'e' nella scocca servita"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it/withus-one.js?v=20260920c" | grep -c "Catalogo prodotti"
echo "== versione.json"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -3
