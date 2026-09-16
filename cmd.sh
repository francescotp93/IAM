echo "== ora"; date '+%F %T'
echo "== Groupama: TUTTO quello che ha detto da lunedì sera (ultime righe)"
journalctl -u groupama-scraper --since '2026-09-14 20:00' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -avE 'gracefully|forcefully|<kill>|pid=' | tail -18
echo
echo "== da quanto gira il servizio groupama"; systemctl show -p ActiveEnterTimestamp --value groupama-scraper
echo "== cosa pensa il guardiano di ogni fonte (ultimo giro)"
curl -s -m 10 http://127.0.0.1:3000/fonti/vigilanza 2>/dev/null | head -c 600; echo
echo "== memoria del guardiano su disco (stato per fonte)"
for f in /opt/withus-backend/server/*vigilanza*.json /opt/withus-backend/server/*watchdog*.json; do [ -f "$f" ] && { echo "--- $f"; head -c 900 "$f"; echo; }; done
