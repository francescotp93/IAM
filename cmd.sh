echo "aspetto il rilascio (max 3 min)"
for i in $(seq 1 12); do h=$(git -C /opt/withus-backend rev-parse --short HEAD); [ "$h" != "c2cf0c1" ] && { echo "aggiornato a $h alle $(date '+%T')"; break; }; sleep 15; done
sleep 30
echo "== servizi"; for s in withus-backend axa-scraper groupama-scraper; do printf '%-18s %s da: %s\n' "$s" "$(systemctl is-active $s)" "$(systemctl show -p ActiveEnterTimestamp --value $s)"; done
echo "== stato login"; for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 10 "http://127.0.0.1:$2/loginstate" | head -c 200; echo; done
echo "== spegnimento: stavolta ha salvato? (codice nuovo sui segnali)"
journalctl -u axa-scraper -u groupama-scraper --since '-4min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'SIGTERM|salvata|ripresa|sessionStorage|persistente' | tail -10
