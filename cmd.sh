cd /opt/withus-backend
echo "== commit vivo =="; git log --oneline -1
echo "== versione =="; grep -m2 '"versione"\|"nome"' versione.json
echo "== meta IAM/QUOTO =="; grep -m1 'app-versione"' iam/index.html; grep -m1 'app-versione"' index.html
echo "== motore decisioni =="; ls -la tariffe/motore/decisioni.js
echo "== scocca =="; grep -o 'withus-one.js?v=[0-9a-z]*' iam/index.html | head -1; grep -c "act: 'decisioni'" iam/withus-one.js
echo "== pannello + rotta =="; grep -c 'id="panel-decisioni"' iam/index.html; grep -c "t === 'decisioni'" iam/index.html
echo "== HTTP =="; curl -s -o /dev/null -w "iam=%{http_code} " --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/
curl -s -o /dev/null -w "quoto=%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/
echo "== servito =="; curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -m1 'app-versione"'
echo "== motore servito =="; curl -s -o /dev/null -w "decisioni.js=%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/decisioni.js?v=20260921"
echo "== scocca servita =="; curl -s -o /dev/null -w "withus-one.js=%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it/withus-one.js?v=20260921a"
