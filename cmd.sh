cd /opt/withus-backend
for i in $(seq 1 22); do
  C=$(git log --format=%h -1)
  if [ "$C" = "95d125e" ]; then break; fi
  sleep 8
done
echo "== commit vivo =="; git log --oneline -1
echo "== versione servita =="; grep -o 'app-versione" content="[^"]*"' iam/index.html | head -1
grep -o 'app-versione" content="[^"]*"' index.html | head -1
echo "== i pezzi nuovi nel file servito =="
echo -n "polizze_numero_doppio: "; grep -c "polizze_numero_doppio" index.html
echo -n "polizze senza il contraente: "; grep -c "polizze senza il contraente" index.html
echo -n "non chiudere la pagina: "; grep -c "non chiudere la pagina" index.html
echo -n "CAMPI_OBBLIGATORI nel motore: "; grep -c "CAMPI_OBBLIGATORI" tariffe/motore/flusso-ssf.js
echo "== migrazioni =="; ls supabase/migrations/ | grep 20260922
echo "== il sito =="; curl -s -o /dev/null -w "IAM %{http_code}\n" https://iam.withusassicurazioni.it/
curl -s https://iam.withusassicurazioni.it/ | grep -o 'app-versione" content="[^"]*"' | head -1
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -3
echo -n "dal sito, il motore aggiornato: "; curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/flusso-ssf.js | grep -c "CAMPI_OBBLIGATORI"
