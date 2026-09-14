echo "== ora"; date '+%F %T'
echo "== /status (dice se siamo DENTRO il portale, non se il login è stato fatto da qui)"
curl -s -m 15 "http://127.0.0.1:4700/status" | head -c 400; echo
echo "== /loginstate (dice a che punto è la PROCEDURA di login)"
curl -s -m 10 "http://127.0.0.1:4700/loginstate" | head -c 200; echo
echo "== chi ha scritto auth.json alle 13:07? cerco il salvataggio nel giornale"
journalctl -u axa-scraper --since '13:02' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | tail -20
