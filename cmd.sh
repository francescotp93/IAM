echo "== ora"; date '+%F %T'
echo "== unita' non in stato 'running' (nome per intero)"
systemctl list-units --type=service --all --no-pager --no-legend 2>/dev/null | sed 's/^[●*] *//' | awk '$4!="running"{print $1, $3, $4}'
echo "== giornale groupama, ultimi 20 minuti"
journalctl -u groupama-scraper --since "-20 min" --no-pager -o short 2>/dev/null | tail -12
