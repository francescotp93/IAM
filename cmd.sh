cd /opt/withus-backend || exit 1
echo "== meta IAM sul disco =="; grep -m2 'app-versione' iam/index.html
echo "== blocco M5 presente =="; grep -c 'gio-oggi\|gioRenderGiornata\|gio-anomalie' iam/index.html
R='--resolve iam.withusassicurazioni.it:443:127.0.0.1'
echo "== servito da Caddy =="
curl -s https://iam.withusassicurazioni.it/ $R | grep -m2 'app-versione'
curl -s -o /dev/null -w "iam root: %{http_code}  cache-control: " https://iam.withusassicurazioni.it/ $R
curl -sI https://iam.withusassicurazioni.it/ $R | grep -i '^cache-control'
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json $R | head -4
curl -s -o /dev/null -w "motore contabilita.js: %{http_code}\n" https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/contabilita.js $R
