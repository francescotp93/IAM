ATTESO=7ac257e
for i in $(seq 1 45); do H=$(git -C /opt/withus-backend rev-parse --short=7 HEAD 2>/dev/null); [ "$H" = "$ATTESO" ] && break; sleep 5; done
echo "== HEAD backend: $H (atteso $ATTESO) dopo ~$((i*5)) s"
a=$(curl -s https://iam.withusassicurazioni.it/index.html | md5sum | cut -c1-8); b=$(md5sum /opt/withus-backend/iam/index.html | cut -c1-8); echo "IAM servito=$a disco=$b $([ "$a" = "$b" ] && echo OK || echo DIVERSO)"
echo "== scocca servita: la voce Collaboratori"; curl -s https://iam.withusassicurazioni.it/withus-one.js | grep -c "l: 'Collaboratori', i: 'i-users'"
echo "== IAM chiede la scocca nuova:"; curl -s https://iam.withusassicurazioni.it/ | grep -o 'withus-one.js?v=[0-9a-z]*'
echo "== siti:"; for u in https://iam.withusassicurazioni.it/ https://iam.withusassicurazioni.it/nuovo-preventivo/ https://api.withusassicurazioni.it/health; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
