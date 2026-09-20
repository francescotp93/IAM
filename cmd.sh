cd /opt/withus-backend
for i in $(seq 1 16); do
  if grep -q 'app-versione" content="0.3.1"' iam/index.html 2>/dev/null; then break; fi
  sleep 10
done
echo "atteso: $((i*10))s"
git log --oneline -1
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o '<meta name="app-versione[^>]*>' | head -2
echo "--- il kit e' aperto (0 = nessuna regola richiusa) ---"
grep -c '#panel-dashboard \.' iam/index.html
echo "--- le cinque schermate usano la testata del kit ---"
grep -c 'class="page-head"' iam/index.html
