cd /opt/withus-backend || exit 1
echo "== commit =="; git log --oneline -1
echo "== versione.json =="; head -4 versione.json
echo "== meta IAM =="; grep -m2 'app-versione' iam/index.html
echo "== blocco gio* =="; grep -c 'gioRenderGiornata\|gio-oggi\|gio-anomalie' iam/index.html
echo "== HTTP =="
curl -s -o /dev/null -w "iam root: %{http_code}\n" https://iam.withusassicurazioni.it/ --resolve iam.withusassicurazioni.it:443:127.0.0.1
curl -s -w "\nversione.json: %{http_code}\n" https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json --resolve iam.withusassicurazioni.it:443:127.0.0.1 | head -5
