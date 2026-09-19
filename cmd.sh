echo "== commit del clone che Caddy serve =="
git -C /opt/withus-backend log --oneline -1
echo
echo "== i file di oggi ci sono? =="
for f in tariffe/motore/assegnazione.js tariffe/motore/registro.js; do
  printf "%-38s %s\n" "$f" "$(md5sum /opt/withus-backend/$f 2>/dev/null | cut -c1-8 || echo MANCA)"
done
printf "%-38s %s\n" "iam/index.html" "$(md5sum /opt/withus-backend/iam/index.html 2>/dev/null | cut -c1-8 || echo MANCA)"
printf "%-38s %s\n" "index.html (QUOTO)" "$(md5sum /opt/withus-backend/index.html 2>/dev/null | cut -c1-8 || echo MANCA)"
echo
echo "== il blocco dei codici compagnia e' nel documento servito? =="
grep -c "ccpInstalla\|mc-codici" /opt/withus-backend/iam/index.html 2>/dev/null
grep -c "asgApri\|Assegnazione.suoi" /opt/withus-backend/index.html 2>/dev/null
echo
echo "== e come risponde Caddy dall'interno =="
curl -s -o /dev/null -w "iam/                                %{http_code}\n" http://127.0.0.1/ -H 'Host: iam.withusassicurazioni.it'
curl -s -o /dev/null -w "/nuovo-preventivo/tariffe/.../asseg  %{http_code}\n" "http://127.0.0.1/nuovo-preventivo/tariffe/motore/assegnazione.js" -H 'Host: iam.withusassicurazioni.it'
