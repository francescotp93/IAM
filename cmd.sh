echo "== commit vivo"
git -C /opt/withus-backend log --oneline -1
echo "== IAM servito"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o 'name="app-versione[^>]*>'
echo "== i motori nuovi rispondono"
for f in sospensione catalogo; do
  printf "%-14s " "$f"
  curl -sI --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/$f.js" | head -1
done
echo "== QUOTO servito"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/ | grep -c 'id="pf-nuova"\|id="atr-icona"\|id="rin-sospese"'
