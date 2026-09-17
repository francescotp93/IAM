echo "== ora"; date '+%F %T'
echo "== unita' systemd che parlano di groupama/scraper"
systemctl list-units --type=service --all --no-pager --no-legend 2>/dev/null | grep -iE "groupama|scraper|withus" | awk '{print $1, $3, $4}'
echo "== chi ascolta su 4500"
ss -ltnp 2>/dev/null | grep 4500
echo "== stato groupama adesso"
curl -s --max-time 8 http://127.0.0.1:4500/loginstate; echo
