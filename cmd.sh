echo "== ora"; date '+%F %T'
sleep 90
cd /opt/withus-backend
echo "== commit vivo sul VPS"
git log --oneline -1
echo "== il codice nuovo c'e'?"
grep -c "codice_chiesto_il" server/fonti.js scraper/groupama/quote-service.mjs
echo "== servizi"
systemctl is-active withus-backend withus-scraper-groupama 2>&1
echo "== stato groupama"
curl -s --max-time 8 http://127.0.0.1:4500/loginstate; echo
echo "== giornale groupama, ultime 15 righe"
journalctl -u withus-scraper-groupama --since "-10 min" --no-pager -o short 2>/dev/null | tail -15
