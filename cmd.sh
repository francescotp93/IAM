cd /opt/withus-backend || exit 1
sleep 80
git log --oneline -1
R='--resolve iam.withusassicurazioni.it:443:127.0.0.1'
curl -s https://iam.withusassicurazioni.it/ $R | grep -m1 'app-versione'
echo "-- la query corretta e' quella servita:"
curl -s https://iam.withusassicurazioni.it/ $R | grep -c "id,nome,cognome,stato"
curl -s https://iam.withusassicurazioni.it/ $R | grep -c "select('id,nominativo,stato')"
