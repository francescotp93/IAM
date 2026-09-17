echo "== ora"; date '+%F %T'
echo "== stato groupama"; curl -s -m 12 http://127.0.0.1:4500/loginstate | head -c 220; echo
f=/opt/withus-backend/scraper/groupama/auth.json; [ -f "$f" ] && echo "auth.json: $(date -r "$f" '+%F %T')"
echo "== IL PUNTO: il backend ha preso il codice dalla posta?"
journalctl -u withus-backend --since '-30min' --no-pager 2>/dev/null | grep -aiE 'otp-posta' | tail -8
echo "== giornale groupama, ultimi 30 minuti"
journalctl -u groupama-scraper --since '-30min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -avE 'gracefully|forcefully|<kill>|systemd' | tail -12
