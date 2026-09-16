echo "== ora: $(date '+%F %T')"
A=$(dig +short A iam.withusassicurazioni.it @dns.technorail.com 2>/dev/null | tr '\n' ' ')
echo "== autoritativo Aruba: A=$A"
case "$A" in *51.254.142.199*) ;; *) echo "Aruba non risponde piu' con il VPS: mi fermo"; exit 0;; esac
echo "== reload caddy (fa ripartire subito la richiesta del certificato)"
systemctl reload caddy && echo "reload ok" || { echo "reload FALLITO: $(systemctl is-active caddy)"; exit 1; }
for i in $(seq 1 24); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -m 8 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ 2>/dev/null)
  [ "$C" = "200" ] && break; sleep 5
done
echo "== https://iam./ con certificato verificato: $C dopo ~$((i*5)) s"
journalctl -u caddy --since '-3min' --no-pager -o cat 2>/dev/null | grep -i 'iam.withus' | grep -iE 'obtained|successfully|error' | tail -3 | cut -c1-220
R() { curl -s -o /dev/null -w '%{http_code}' -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it$1"; }
echo "IAM /=$(R /) js=$(R /withus-one.js?v=20260915a) analisi=$(R /analisi-bisogni.html) | nascosti verifica=$(R /verifica/fonti.test.mjs) vercel.json=$(R /vercel.json)"
echo "QUOTO /nuovo-preventivo=$(R /nuovo-preventivo) /=$(R /nuovo-preventivo/) motore=$(R /nuovo-preventivo/tariffe/motore/amtrust.js) json=$(R /nuovo-preventivo/tariffe/rc_professionale.json) lab=$(R /nuovo-preventivo/lab/) | nascosti server=$(R /nuovo-preventivo/server/index.js) env=$(R /nuovo-preventivo/server/.env) md=$(R /nuovo-preventivo/CLAUDE.md)"
echo "servizi via iam.: /health=$(R /health) /pay/config=$(R /pay/config) | api.=$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health) quoto.=$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://quoto.withusassicurazioni.it/)"
echo "md5 IAM servito/disco: $(curl -s -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | md5sum | cut -c1-8) / $(md5sum /opt/withus-iam/index.html | cut -c1-8)  HEAD iam: $(git -C /opt/withus-iam rev-parse --short HEAD)"
echo "== risolutore VPS: $(getent ahostsv4 iam.withusassicurazioni.it | awk '{print $1}' | head -1) (cache, si aggiorna da sola entro il TTL)"
