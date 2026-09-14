echo "== ora"; date '+%F %T'
echo "== stato login"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 8 "http://127.0.0.1:$2/loginstate" | head -c 220; echo; done
echo "== auth.json (data e dimensione)"
for c in axa groupama; do f=/opt/withus-backend/scraper/$c/auth.json; [ -f "$f" ] && printf '%-9s %s  %s byte\n' "$c" "$(date -r "$f" '+%F %T')" "$(stat -c%s "$f")"; done
echo "== AXA: cosa è successo dalle 12:25"
journalctl -u axa-scraper --since '12:25' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | tail -25
