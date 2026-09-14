echo "== ora"; date '+%F %T'
echo "== servizio AXA avviato alle: $(systemctl show -p ActiveEnterTimestamp --value axa-scraper)"
echo "== ESITO: AXA ha superato il riavvio da sola?"
curl -s -m 12 http://127.0.0.1:4700/loginstate | head -c 240; echo
curl -s -m 12 http://127.0.0.1:4700/status | head -c 200; echo
echo "== il giornale, dal riavvio in poi"
journalctl -u axa-scraper --since '20:30' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | tail -14
