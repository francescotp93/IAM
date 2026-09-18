echo "== il VPS ha preso la correzione? =="
echo -n "commit: "; git -C /opt/withus-backend log --oneline -1 2>&1
echo -n "no-cache nel file del repo:   "; grep -c 'Cache-Control "no-cache"' /opt/withus-backend/deploy/caddy/iam.caddy 2>&1
echo -n "no-cache nel sito in esecuzione: "; grep -c 'Cache-Control "no-cache"' /etc/caddy/withus/iam.caddy 2>&1
echo
echo "== gli header che il browser riceve davvero =="
echo "-- IAM alla radice:"
curl -sS -o /dev/null -D - https://127.0.0.1/ -H 'Host: iam.withusassicurazioni.it' --resolve 'iam.withusassicurazioni.it:443:127.0.0.1' -k 2>&1 | grep -iE "^(HTTP|cache-control|etag)" 
echo "-- il riquadro /nuovo-preventivo/:"
curl -sS -o /dev/null -D - https://127.0.0.1/nuovo-preventivo/ -H 'Host: iam.withusassicurazioni.it' --resolve 'iam.withusassicurazioni.it:443:127.0.0.1' -k 2>&1 | grep -iE "^(HTTP|cache-control|etag)"
echo "-- un motore di tariffa (deve restare in cache):"
curl -sS -o /dev/null -D - "https://127.0.0.1/nuovo-preventivo/tariffe/motore/fascicolo.js" -H 'Host: iam.withusassicurazioni.it' --resolve 'iam.withusassicurazioni.it:443:127.0.0.1' -k 2>&1 | grep -iE "^(HTTP|cache-control|etag)"
