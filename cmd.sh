echo "== ora"; date '+%F %T'
echo "== stato"
for pair in "groupama 4500" "axa 4700"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 10 "http://127.0.0.1:$2/loginstate" | head -c 190; echo; done
for c in axa groupama; do f=/opt/withus-backend/scraper/$c/auth.json; [ -f "$f" ] && printf '%-9s auth.json %s\n' "$c" "$(date -r "$f" '+%F %T')"; done
echo "== IL PUNTO: il backend è andato a prendere il codice dalla posta?"
journalctl -u withus-backend --since '-4h' --no-pager 2>/dev/null | grep -aiE 'otp-posta|vigilanza-fonti' | tail -12
echo "== Groupama: caduta e rientro"
journalctl -u groupama-scraper --since '-4h' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'caduta|scadut|codice|OTP|login|sessione' | tail -10
echo "== AXA: il codice dal seme è stato rifiutato?"
journalctl -u axa-scraper --since '-4h' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'seme|rifiutat|2FA|sessione|rimbalzo|login' | tail -10
