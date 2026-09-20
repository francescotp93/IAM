cd /opt/withus-backend || exit 1
sleep 75
git log --oneline -1
R='--resolve iam.withusassicurazioni.it:443:127.0.0.1'
curl -s https://iam.withusassicurazioni.it/ $R | grep -m2 'app-versione'
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/ $R | grep -m2 'app-versione'
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json $R | head -4
curl -s -o /dev/null -w "motore estratto-conto: %{http_code}\n" https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/estratto-conto.js $R
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/ $R | grep -c 'motore/contabilita.js'
