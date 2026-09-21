cd /opt/withus-backend
echo "== commit =="; git log --oneline -1
echo "== versione =="; grep -m2 '"versione"\|"nome"' versione.json
echo "== motore =="; ls -la tariffe/motore/piano-rate.js
echo "== rotta e menu =="; grep -c "portafoglio:nuova" index.html iam/withus-one.js
echo "== scocca =="; grep -o 'withus-one.js?v=[0-9a-z]*' iam/index.html | head -1
echo "== HTTP =="; curl -s -o /dev/null -w "iam=%{http_code} quoto=" --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/
curl -s -o /dev/null -w "%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/
echo "== servito =="; curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -m1 'app-versione"'
curl -s -o /dev/null -w "piano-rate.js=%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/piano-rate.js?v=20260921"
