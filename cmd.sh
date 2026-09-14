echo "== ora"; date '+%F %T'
echo "== AXA: tutto quello che ha detto dalle 11:20"
journalctl -u axa-scraper --since '11:20' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | tail -40
echo
echo "== stato adesso"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 8 "http://127.0.0.1:$2/loginstate" | head -c 200; echo; done
echo "== allianz riavviato col codice nuovo?"
systemctl show -p ActiveEnterTimestamp --value allianz-scraper
grep -c "motivoPremioAssente" /opt/withus-backend/scraper/allianz/quote-service.mjs
