cd /opt/withus-backend || exit 1
sleep 80
git log --oneline -1
R='--resolve iam.withusassicurazioni.it:443:127.0.0.1'
curl -s https://iam.withusassicurazioni.it/ $R | grep -m1 'app-versione'
echo "-- la scocca servita ha i due cassetti:"
curl -s "https://iam.withusassicurazioni.it/withus-one.js?v=20260920b" $R | grep -c "l: 'Preventivatore'\|l: 'Gestionale'"
echo "-- e il nome ambiguo non c'e' piu':"
curl -s https://iam.withusassicurazioni.it/ $R | grep -c "CONTAB_SUB = \['quadratura','primanota','quadconti'"
