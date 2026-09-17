ATTESO=4bc2bcf
for i in $(seq 1 40); do H=$(git -C /opt/withus-backend rev-parse --short=7 HEAD 2>/dev/null); [ "$H" = "$ATTESO" ] && break; sleep 5; done
echo "== HEAD backend: $H (atteso $ATTESO) dopo ~$((i*5)) s"
a=$(curl -s https://iam.withusassicurazioni.it/nuovo-preventivo/index.html | md5sum | cut -c1-8); b=$(md5sum /opt/withus-backend/index.html | cut -c1-8); echo "index servito=$a disco=$b $([ "$a" = "$b" ] && echo OK || echo DIVERSO)"
printf '%s pdf-withus.js\n' "$(curl -s -o /dev/null -w '%{http_code}' https://iam.withusassicurazioni.it/nuovo-preventivo/tariffe/motore/pdf-withus.js)"
echo "== ultimi giri autopull:"; journalctl -u withus-autopull --no-pager -n 40 2>/dev/null | grep "autopull\]" | tail -8
echo "== scraper attivi:"; systemctl list-units --type=service --state=active 2>/dev/null | grep -c "scraper"
