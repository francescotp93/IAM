cd /opt/withus-backend || exit 1
sleep 80
git log --oneline -1
R='--resolve iam.withusassicurazioni.it:443:127.0.0.1'
curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/ $R | grep -m1 'app-versione'
echo "-- pfPremio servito:"; curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/ $R | grep -c "function pfPremio"
