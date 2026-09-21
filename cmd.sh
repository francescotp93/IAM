cd /opt/withus-backend
echo "== commit vivo =="; git log --oneline -1
echo "== versione servita da IAM =="; grep -o 'app-versione" content="[^"]*"' iam/index.html | head -1
echo "== versione servita da QUOTO =="; grep -o 'app-versione" content="[^"]*"' index.html | head -1
echo "== versione.json =="; head -4 versione.json
echo "== la correzione c'e' nel file servito =="; grep -c "titoli_senza_polizza" index.html
echo "== migrazione presente =="; ls supabase/migrations/ | grep 20260922
echo "== il sito risponde =="; curl -s -o /dev/null -w "IAM %{http_code}\n" https://iam.withusassicurazioni.it/
curl -s https://iam.withusassicurazioni.it/ | grep -o 'app-versione" content="[^"]*"' | head -1
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -3
