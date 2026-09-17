ATTESO=224a925
for i in $(seq 1 40); do H=$(git -C /opt/withus-backend rev-parse --short=7 HEAD 2>/dev/null); [ "$H" = "$ATTESO" ] && break; sleep 5; done
echo "== HEAD backend: $H (atteso $ATTESO) dopo ~$((i*5)) s"
a=$(curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/index.html | md5sum | cut -c1-8); b=$(md5sum /opt/withus-backend/index.html | cut -c1-8); echo "index servito=$a disco=$b $([ "$a" = "$b" ] && echo OK || echo DIVERSO)"
echo "== motore datore servito:"; curl -s -o /dev/null -w '%{http_code}\n' https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/tfr-datore.js
echo "== backend attivo e parametri serviti (chiavi tfr_*):"; systemctl is-active withus-backend
TOK=$(grep -o '"anon"' /dev/null); curl -s -o /dev/null -w 'numeri senza token: %{http_code}\n' https://api.withusassicurazioni.it/parametri-previdenziali/numeri
journalctl -u withus-autopull --no-pager -n 8 2>/dev/null | grep autopull | tail -3
