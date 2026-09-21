set +e
echo "== attendo l'autopull =="
for i in $(seq 1 24); do
  C=$(cd /opt/withus-backend && git rev-parse --short HEAD)
  if [ "$C" = "3954c4f" ]; then echo "arrivata dopo ~$((i*10))s"; break; fi
  sleep 10
done
cd /opt/withus-backend && git rev-parse --short HEAD

echo
echo "== la versione servita =="
grep -o 'app-versione" content="[^"]*"' /opt/withus-backend/iam/index.html | head -1
grep -o 'app-versione" content="[^"]*"' /opt/withus-backend/index.html | head -1
grep -o '"versione": "[^"]*"' /opt/withus-backend/versione.json | head -1

echo
echo "== i pezzi nuovi ci sono davvero =="
grep -c "iam_movimento_registra" /opt/withus-backend/iam/index.html
grep -c "CONTI_MINIMI" /opt/withus-backend/tariffe/motore/contabilita.js

echo
echo "== quello che il browser riceve =="
curl -s -o /dev/null -w "iam/  %{http_code}\n" https://iam.withusassicurazioni.it/
curl -s https://iam.withusassicurazioni.it/ | grep -o 'app-versione" content="[^"]*"' | head -1
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -c 130; echo
