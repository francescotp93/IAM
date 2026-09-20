echo "== commit vivo"
git -C /opt/withus-backend log --oneline -1
echo "== IAM servito"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -o 'name="app-versione[^>]*>'
echo "== versione.json"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/nuovo-preventivo/versione.json | head -4
echo "== la fascia c'e' nella pagina servita"
curl -s --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | grep -c 'id="nov-vecchia"'
