echo "== header veri, chiedendo al dominio dall'esterno del server =="
for u in "https://iam.withusassicurazioni.it/" "https://iam.withusassicurazioni.it/nuovo-preventivo/" "https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/fascicolo.js"; do
  echo "-- $u"
  curl -sS -o /dev/null -D - --max-time 20 "$u" 2>&1 | grep -iE "^(HTTP/|cache-control|etag|content-type)" | sed 's/^/   /'
done
echo
echo "== e la pagina servita contiene il codice nuovo? =="
echo -n "   archSuoIndirizzo nella pagina del riquadro: "
curl -sS --max-time 30 "https://iam.withusassicurazioni.it/nuovo-preventivo/" 2>&1 | grep -c "archSuoIndirizzo"
echo -n "   fdocRenderCliente (il tab Documenti nuovo):  "
curl -sS --max-time 30 "https://iam.withusassicurazioni.it/nuovo-preventivo/" 2>&1 | grep -c "fdocRenderCliente"
