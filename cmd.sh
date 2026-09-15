echo "== ora"; date '+%F %T'
echo "== HEAD: $(git -C /opt/withus-backend rev-parse --short HEAD)"
echo "== codice nuovo nel file: $(grep -c 'attendiAccesso(loggedMarker' /opt/withus-backend/scraper/axa/quote-service.mjs) chiamate"
echo "== AXA avviato alle: $(systemctl show -p ActiveEnterTimestamp --value axa-scraper)"
echo "== stato"; curl -s -m 12 http://127.0.0.1:4700/loginstate | head -c 200; echo
echo "== giornale AXA (ultime righe utili)"
journalctl -u axa-scraper --since '-40min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'sessione ripresa|rimbalzo|non è più valida|PRONTO|rientrat|persistente|login completato' | tail -8
