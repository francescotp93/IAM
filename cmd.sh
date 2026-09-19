echo "== ora"; date '+%F %T %Z'
cd /opt/withus-backend
echo "== commit vivo"; git log --oneline -1
echo "== l'interruttore e' arrivato nel servizio che gira?"
systemctl show groupama-scraper -p Environment --no-pager 2>/dev/null | tr ' ' '\n' | grep -i RIENTRO || echo "  NON c'e' ancora (deploy non arrivato)"
echo
echo "== stato groupama adesso"
curl -s --max-time 8 http://127.0.0.1:4500/loginstate; echo
echo "auth.json: $(stat -c %y scraper/groupama/auth.json 2>/dev/null | cut -c1-19)"
echo
echo "== giornale groupama, ultimi 30 minuti"
journalctl -u groupama-scraper --since "-30 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -18
echo
echo "== backend: vigilanza e posta, ultimi 30 minuti"
journalctl -u withus-backend --since "-30 min" --no-pager -o cat 2>/dev/null | grep -iE "otp-posta|groupama|vigilanza-fonti] giro" | tail -12
