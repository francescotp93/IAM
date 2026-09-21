cd /opt/withus-backend
git log --oneline -1
grep -m2 '"versione"\|"nome"' versione.json
ls tariffe/motore/piano-rate.js 2>&1
echo "rotta+menu:"; grep -c "portafoglio:nuova" index.html iam/withus-one.js
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -m1 'app-versione"'
curl -s -o /dev/null -w "piano-rate.js=%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/piano-rate.js?v=20260921"
curl -s -o /dev/null -w "scocca=%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it/withus-one.js?v=20260921b"
