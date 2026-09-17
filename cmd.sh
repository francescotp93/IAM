ATTESO=8e8626e
for i in $(seq 1 45); do H=$(git -C /opt/withus-backend rev-parse --short=7 HEAD 2>/dev/null); [ "$H" = "$ATTESO" ] && break; sleep 5; done
echo "== HEAD backend: $H (atteso $ATTESO) dopo ~$((i*5)) s"
a=$(curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/index.html | md5sum | cut -c1-8); b=$(md5sum /opt/withus-backend/index.html | cut -c1-8); echo "index servito=$a disco=$b $([ "$a" = "$b" ] && echo OK || echo DIVERSO)"
echo "== testiInvio nel motore servito:"; curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/pensione.js | grep -c "function testiInvio"
echo "== backend:"; systemctl is-active withus-backend; curl -s -o /dev/null -w 'health %{http_code}\n' https://api.withusassicurazioni.it/health
echo "== siti:"; for u in https://iam.withusassicurazioni.it/ https://iam.withusassicurazioni.it/nuovo-preventivo/; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
