echo "== ora"; date '+%F %T %Z'
sleep 120
cd /opt/withus-backend
echo "== commit vivo"; git log --oneline -1
echo "== la guardia c'e' nel codice che gira?"
grep -c "LOGIN_STATE.step !== 'loggato'" scraper/groupama/quote-service.mjs
echo "== stato groupama"
systemctl is-active groupama-scraper.service
curl -s --max-time 6 http://127.0.0.1:4500/loginstate; echo
echo "== il suo giornale"
journalctl -u groupama-scraper --since "-10 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -8
