cd /opt/withus-backend
for i in $(seq 1 22); do
  C=$(git log --format=%h -1)
  if [ "$C" = "41034d7" ]; then break; fi
  sleep 8
done
echo "== commit vivo =="; git log --oneline -1
echo "== versione servita da IAM =="; grep -o 'app-versione" content="[^"]*"' iam/index.html | head -1
echo "== versione servita da QUOTO =="; grep -o 'app-versione" content="[^"]*"' index.html | head -1
echo "== la correzione c'e' nel file servito (attesi >=1) =="; grep -c "titoli_senza_polizza" index.html
echo "== migrazione presente =="; ls supabase/migrations/ | grep 20260922
echo "== il sito risponde =="; curl -s -o /dev/null -w "IAM %{http_code}\n" https://iam.withusassicurazioni.it/
curl -s https://iam.withusassicurazioni.it/ | grep -o 'app-versione" content="[^"]*"' | head -1
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -3
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/ | grep -c "titoli_senza_polizza"
