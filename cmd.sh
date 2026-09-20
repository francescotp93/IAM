echo "== cosa serve iam. alla radice"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o 'name="app-versione[^>]*>'
echo "== header della pagina IAM"
curl -sI --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | egrep -i 'HTTP/|cache-control|etag|last-modified'
echo "== versione.json servito"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -c 200
echo
echo "== header del preventivatore"
curl -sI --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/ | egrep -i 'HTTP/|cache-control|etag'
echo "== quoto. (GitHub Pages)"
curl -s --max-time 20 https://quoto.withusassicurazioni.it/ | grep -o 'name="app-versione[^>]*>'
echo "== scocca servita"
curl -sI --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/withus-one.js | egrep -i 'HTTP/|cache-control'
echo "== autopull ultime righe"
tail -12 /var/log/withus-autopull.log 2>/dev/null || journalctl -u withus-autopull -n 12 --no-pager 2>/dev/null | tail -12
