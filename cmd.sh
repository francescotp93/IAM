echo "== ora: $(date '+%F %T')"
D() { if command -v dig >/dev/null; then dig +short "$@" 2>/dev/null; else echo "(dig assente)"; fi; }
echo "== NS autoritativi di withusassicurazioni.it: $(D NS withusassicurazioni.it | tr '\n' ' ')"
for ns in $(D NS withusassicurazioni.it); do
  echo "== @$ns  A=$(D A iam.withusassicurazioni.it @$ns | tr '\n' ' ') CNAME=$(D CNAME iam.withusassicurazioni.it @$ns | tr '\n' ' ') AAAA=$(D AAAA iam.withusassicurazioni.it @$ns | tr '\n' ' ')"
done
echo "== risolutore del VPS ora: $(getent ahostsv4 iam.withusassicurazioni.it | awk '{print $1}' | head -1)  TTL residuo: $(dig iam.withusassicurazioni.it A 2>/dev/null | awk '/^iam\./{print $2; exit}')"
# aspetto fino a ~200 s che il risolutore del VPS veda l'indirizzo nuovo
for i in $(seq 1 20); do
  IP=$(getent ahostsv4 iam.withusassicurazioni.it | awk '{print $1}' | head -1)
  [ "$IP" = "51.254.142.199" ] && break
  sleep 10
done
echo "== risolutore del VPS dopo ~$((i*10)) s: ${IP:-nessuna risposta}"
if [ "$IP" != "51.254.142.199" ]; then echo "NON ANCORA: il VPS vede ancora il vecchio indirizzo. Non ricarico Caddy."; exit 0; fi
echo "== reload caddy"; systemctl reload caddy && echo "reload ok" || { echo "reload FALLITO: $(systemctl is-active caddy)"; exit 1; }
for i in $(seq 1 12); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -m 8 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ 2>/dev/null)
  [ "$C" = "200" ] && break; sleep 5
done
echo "== https://iam./ con certificato verificato: $C dopo ~$((i*5)) s"
journalctl -u caddy --since '-3min' --no-pager -o cat 2>/dev/null | grep -i 'iam.withus' | grep -iE 'obtained|successfully' | tail -2 | cut -c1-200
R() { curl -s -o /dev/null -w '%{http_code}' -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it$1"; }
echo "IAM /=$(R /) js=$(R /withus-one.js?v=20260915a) analisi=$(R /analisi-bisogni.html) | nascosti verifica=$(R /verifica/fonti.test.mjs) vercel.json=$(R /vercel.json)"
echo "QUOTO /nuovo-preventivo=$(R /nuovo-preventivo) /=$(R /nuovo-preventivo/) motore=$(R /nuovo-preventivo/tariffe/motore/amtrust.js) json=$(R /nuovo-preventivo/tariffe/rc_professionale.json) lab=$(R /nuovo-preventivo/lab/) | nascosti server=$(R /nuovo-preventivo/server/index.js) env=$(R /nuovo-preventivo/server/.env) md=$(R /nuovo-preventivo/CLAUDE.md)"
echo "servizi via iam.: /health=$(R /health) /pay/config=$(R /pay/config) | api.=$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health) quoto.=$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://quoto.withusassicurazioni.it/)"
echo "md5 IAM servito/disco: $(curl -s -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | md5sum | cut -c1-8) / $(md5sum /opt/withus-iam/index.html | cut -c1-8)"
