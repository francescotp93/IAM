echo "== ora"; date '+%F %T'
echo "== HEAD: $(git -C /opt/withus-backend rev-parse --short HEAD)"
echo "== il rientro automatico e' nel file? $(grep -c 'rientroTentato' /opt/withus-backend/scraper/groupama/quote-service.mjs) riferimenti"
echo "== groupama avviato alle: $(systemctl show -p ActiveEnterTimestamp --value groupama-scraper)"
echo "== stato"; curl -s -m 12 http://127.0.0.1:4500/loginstate | head -c 200; echo
echo "== giornale groupama, ultimi 15 minuti"
journalctl -u groupama-scraper --since '-15min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -avE 'gracefully|forcefully|<kill>' | tail -10
echo "== il backend e' andato a prendere il codice?"
journalctl -u withus-backend --since '-15min' --no-pager 2>/dev/null | grep -aiE 'otp-posta|codice_dalla_posta' | tail -6
