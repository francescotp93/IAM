ATTESO=9e387eb
for i in $(seq 1 40); do
  H=$(git -C /opt/withus-backend rev-parse --short=7 HEAD 2>/dev/null)
  [ "$H" = "$ATTESO" ] && grep -q "frame-ancestors" /etc/caddy/withus/iam.caddy 2>/dev/null && break
  sleep 5
done
echo "== HEAD backend: $H (atteso $ATTESO) dopo ~$((i*5)) s"
echo "== autopull sui siti Caddy:"; journalctl -u withus-autopull --no-pager -n 30 2>/dev/null | grep -i "caddy\|aggiorno" | tail -4
echo "== header su /nuovo-preventivo/:"; curl -sI https://iam.withusassicurazioni.it/nuovo-preventivo/ | grep -i -E "^HTTP|content-security|x-frame" 
echo "== header su un motore (deve avere la CSP anche lui, e' nello stesso blocco):"; curl -sI https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/pensione.js | grep -i -E "^HTTP|content-security"
echo "== IAM alla radice (nessuna CSP attesa qui):"; curl -sI https://iam.withusassicurazioni.it/ | grep -i -E "^HTTP|content-security|x-frame"
echo "== api:"; curl -s -o /dev/null -w '%{http_code}\n' https://api.withusassicurazioni.it/health
echo "== caddy:"; systemctl is-active caddy
