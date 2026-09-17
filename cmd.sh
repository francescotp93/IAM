echo "aspetto il primo giro del keep-alive (atteso 06:57:38)"; sleep 180
echo "== ora"; date '+%F %T'
echo "== stato"; curl -s -m 12 http://127.0.0.1:4500/loginstate | head -c 220; echo
echo "== giornale groupama dal riavvio"
journalctl -u groupama-scraper --since '06:53' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -avE 'gracefully|forcefully|<kill>|systemd' | tail -12
echo "== backend: e' andato a prendere il codice dalla posta?"
journalctl -u withus-backend --since '06:53' --no-pager 2>/dev/null | grep -aiE 'otp-posta|codice_dalla_posta|vigilanza-fonti' | tail -6
