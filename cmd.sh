cd /opt/withus-backend
echo "== commit vivo =="; git log --oneline -1
echo "== versione.json =="; grep -m2 '"versione"\|"nome"' versione.json
echo "== meta IAM =="; grep -m2 'app-versione' iam/index.html
echo "== motori nuovi =="; ls -la tariffe/motore/collegamenti.js tariffe/motore/kpi.js 2>&1
echo "== dco/kpi nel documento =="; grep -c 'dcoApri\|caricaKpiScrivania' iam/index.html
echo "== HTTP iam =="; curl -s -o /dev/null -w "%{http_code}\n" --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/
echo "== versione servita =="; curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -m1 app-versione
echo "== versione.json servito =="; curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -c 120
