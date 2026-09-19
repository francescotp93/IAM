U=https://iam.withusassicurazioni.it
R="--resolve iam.withusassicurazioni.it:443:127.0.0.1"
cd /opt/withus-backend
echo "=== COMMIT SUL SERVER ==="; git log --oneline -3
echo
echo "=== AUTOPULL: ultimo giro ==="; ls -l --time-style=+%H:%M:%S index.html iam/index.html
echo
echo "=== PAGINA IAM SERVITA (brief #02 M1) ==="
P=$(curl -sSk $R $U/ 2>/dev/null)
echo "$P" | wc -c
for m in 'panel-conti' 'cntCarica' 'motore/contabilita.js' 'mc-codici' 'reg-ultima'; do
  printf '  %-26s %s\n' "$m" "$(echo "$P" | grep -c "$m")"
done
echo
echo "=== SCOCCA SERVITA ==="
S=$(curl -sSk $R "$U/withus-one.js" 2>/dev/null)
for m in 'Conti e causali' 'Importa portafoglio'; do
  printf '  %-26s %s\n' "$m" "$(echo "$S" | grep -c "$m")"
done
echo
echo "=== PREVENTIVATORE SERVITO DENTRO IAM (brief #01 M1-M5) ==="
Q=$(curl -sSk $R $U/nuovo-preventivo/ 2>/dev/null)
echo "$Q" | wc -c
for m in 'pol-emissione' 'polProduttore' 'clSinistri' 'pf-date-su' 'pf-cerca' 'sinf-compagnia' 'RIN_FASCE' 'motore/anagrafica.js' 'cpl-oggi' 'tit-chi-paga' 'ecpTabellaCredito' 'page-foglio-cassa' 'motore/foglio-cassa.js'; do
  printf '  %-26s %s\n' "$m" "$(echo "$Q" | grep -c "$m")"
done
echo
echo "=== HEADER DEI DUE DOCUMENTI ==="
curl -sSk $R -I $U/ 2>/dev/null | grep -iE 'cache-control|etag|last-modified'
curl -sSk $R -I $U/nuovo-preventivo/ 2>/dev/null | grep -iE 'cache-control|etag|last-modified'
