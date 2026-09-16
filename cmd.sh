echo "== ora: $(date '+%F %T')"
IP=$(getent ahostsv4 iam.withusassicurazioni.it | awk '{print $1}' | head -1)
echo "== DNS visto dal VPS: iam. → ${IP:-nessuna risposta}"
if [ "$IP" != "51.254.142.199" ]; then echo "DNS non ancora propagato qui: non ricarico. Riprovare."; exit 0; fi
echo "== reload caddy per far ripartire subito il certificato"
systemctl reload caddy && echo "reload ok" || { echo "reload FALLITO"; systemctl is-active caddy; exit 1; }
# aspetto il certificato (max ~150 s): https con verifica VERA del certificato
for i in $(seq 1 30); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -m 8 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ 2>/dev/null)
  [ "$C" = "200" ] && break
  sleep 5
done
echo "== https://iam./ (certificato verificato): $C dopo ~$((i*5)) s"
echo "== giornale caddy, certificato:"; journalctl -u caddy --since '-4min' --no-pager -o cat 2>/dev/null | grep -i 'iam.withus' | grep -iE 'obtained|successfully|certificate obtained|releasing lock' | tail -3 | cut -c1-220
R() { curl -s -o /dev/null -w '%{http_code}' -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it$1"; }
echo "== IAM radice /                         → $(R /)  (atteso 200)"
echo "== IAM /withus-one.js?v=20260915a       → $(R /withus-one.js?v=20260915a)  (200)"
echo "== IAM /analisi-bisogni.html            → $(R /analisi-bisogni.html)  (200)"
echo "== IAM /verifica/fonti.test.mjs         → $(R /verifica/fonti.test.mjs)  (404 nascosto)"
echo "== IAM /vercel.json                     → $(R /vercel.json)  (404 nascosto)"
echo "== QUOTO /nuovo-preventivo              → $(R /nuovo-preventivo)  (308)"
echo "== QUOTO /nuovo-preventivo/             → $(R /nuovo-preventivo/)  (200)"
echo "== QUOTO /nuovo-preventivo/tariffe/motore/amtrust.js → $(R /nuovo-preventivo/tariffe/motore/amtrust.js)  (200, motore)"
echo "== QUOTO /nuovo-preventivo/tariffe/rc_professionale.json → $(R /nuovo-preventivo/tariffe/rc_professionale.json)  (200, premi)"
echo "== QUOTO /nuovo-preventivo/lab/         → $(R /nuovo-preventivo/lab/)  (200, Marketing)"
echo "== QUOTO /nuovo-preventivo/server/index.js → $(R /nuovo-preventivo/server/index.js)  (404 nascosto)"
echo "== QUOTO /nuovo-preventivo/server/.env  → $(R /nuovo-preventivo/server/.env)  (404 nascosto)"
echo "== QUOTO /nuovo-preventivo/CLAUDE.md    → $(R /nuovo-preventivo/CLAUDE.md)  (404 nascosto)"
echo "== servizi via iam. /health             → $(R /health)  (200 dal backend)"
echo "== servizi via iam. /pay/config         → $(R /pay/config)  (200 dal backend)"
echo "== api. health                          → $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health)  (200, invariato)"
echo "== quoto. (Pages, invariato)            → $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://quoto.withusassicurazioni.it/)"
echo "== md5 index IAM servito vs /opt/withus-iam: $(curl -s -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | md5sum | cut -c1-8) vs $(md5sum /opt/withus-iam/index.html | cut -c1-8)"
