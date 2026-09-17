ATTESO=87d3fc8
for i in $(seq 1 40); do
  H=$(git -C /opt/withus-backend rev-parse --short=7 HEAD 2>/dev/null)
  [ "$H" = "$ATTESO" ] && break
  sleep 5
done
echo "== HEAD backend: $H (atteso $ATTESO) dopo ~$((i*5)) s"
echo "== md5 servito vs disco"
for c in "/nuovo-preventivo/index.html:/opt/withus-backend/index.html" "/index.html:/opt/withus-backend/iam/index.html" "/withus-one.js:/opt/withus-backend/iam/withus-one.js"; do
  u=${c%%:*}; f=${c#*:}
  a=$(curl -s "https://iam.withusassicurazioni.it$u" | md5sum | cut -c1-8); b=$(md5sum "$f" | cut -c1-8)
  echo "$u servito=$a disco=$b $([ "$a" = "$b" ] && echo OK || echo DIVERSO)"
done
echo "== la scocca servita ha quoto-apri:"; curl -s https://iam.withusassicurazioni.it/withus-one.js | grep -c "quoto-apri"
echo "== IAM chiede la scocca con la versione nuova:"; curl -s https://iam.withusassicurazioni.it/ | grep -o 'withus-one.js?v=[0-9a-z]*'
echo "== QUOTO servito senza loadUtenti:"; curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/ | grep -c "function loadUtenti"
echo "== siti:"; for u in https://iam.withusassicurazioni.it/ https://iam.withusassicurazioni.it/nuovo-preventivo/ https://api.withusassicurazioni.it/health; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
echo "== backend:"; systemctl is-active withus-backend; journalctl -u withus-autopull --no-pager -n 6 2>/dev/null | grep autopull | tail -3
