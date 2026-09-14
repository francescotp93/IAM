echo "== ora"; date '+%F %T'
echo "== HEAD sul server"
git -C /opt/withus-backend log --oneline -1
echo "== autopull ultimi 10 minuti"
journalctl -u withus-autopull --since '-10min' --no-pager 2>/dev/null | grep -aE 'aggiorno|riavviat|fatto' | tail -8
echo "== servizi"
for s in withus-backend allianz-scraper axa-scraper groupama-scraper; do printf '%-20s %s\n' "$s" "$(systemctl is-active $s)"; done
echo "== health"; curl -s -m 8 http://127.0.0.1:3000/health; echo
echo "== sessioni ancora in piedi?"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 8 "http://127.0.0.1:$2/loginstate" | head -c 160; echo; done
