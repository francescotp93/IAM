echo "== ora"; date '+%F %T %Z'
echo "== PERCHE' GROUPAMA E' TORNATO SU DOPO CHE L'AVEVO FERMATO"
systemctl show groupama-scraper -p Restart -p RestartSec --no-pager 2>/dev/null
journalctl -u groupama-scraper --since "-60 min" --no-pager -o short 2>/dev/null | grep -iE "Started|Stopped|Stopping|Scheduled restart|SIGTERM" | tail -12
echo "-- e autopull, cosa ha riavviato --"
journalctl -u withus-autopull --since "-60 min" --no-pager -o cat 2>/dev/null | grep -iE "riavvi|restart|groupama" | tail -10
echo
echo "== LO FERMO DI NUOVO e questa volta lo tengo giu'"
systemctl stop groupama-scraper.service 2>&1
sleep 2
echo -n "stato: "; systemctl is-active groupama-scraper.service 2>&1
