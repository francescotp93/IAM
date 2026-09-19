echo "== ora"; date '+%F %T %Z'
sleep 100
cd /opt/withus-backend
echo "== commit vivo"; git log --oneline -1
echo "== l'interruttore e' nel codice che gira?"
grep -c "GROUPAMA_RIENTRO_AUTO" scraper/groupama/quote-service.mjs
echo "== ed e' acceso da qualche parte? (deve essere vuoto: spento)"
systemctl show groupama-scraper -p Environment -p EnvironmentFiles --no-pager 2>/dev/null | grep -i RIENTRO || echo "  nessuna variabile: spento, come deve"
grep -rl "GROUPAMA_RIENTRO_AUTO" /etc/systemd/system/ /opt/withus-backend/server/.env 2>/dev/null || echo "  non impostata da nessuna parte: spento"
echo
echo "== stato groupama"
systemctl is-active groupama-scraper.service
curl -s --max-time 6 http://127.0.0.1:4500/loginstate; echo
echo "== ultime righe del suo giornale"
journalctl -u groupama-scraper --since "-10 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -8
