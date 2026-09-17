echo "== ora"; date '+%F %T %Z'
echo "== FERMO GROUPAMA"
systemctl stop groupama-scraper.service 2>&1
sleep 3
echo -n "stato adesso: "; systemctl is-active groupama-scraper.service 2>&1
echo -n "risponde ancora sulla 4500? "; curl -s --max-time 5 http://127.0.0.1:4500/loginstate || echo "no, e' fermo"
echo
echo "== PERCHE' CHIEDEVA CODICI IN CONTINUAZIONE — giornale dalle 18:20"
journalctl -u groupama-scraper --since "-70 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -40
