echo "== ora"; date '+%F %T %Z'
echo "== fermo groupama per fermare il battito ogni 4 minuti"
systemctl stop groupama-scraper.service 2>&1
sleep 2
echo -n "stato: "; systemctl is-active groupama-scraper.service 2>&1
echo -n "porta 4500: "; curl -s --max-time 5 http://127.0.0.1:4500/loginstate || echo "muta"
echo
echo "NOTA: torna su da solo al prossimo deploy (autopull). La cura vera e' la correzione al keep-alive."
