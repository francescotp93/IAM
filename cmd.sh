echo "aspetto che autopull prenda il codice nuovo e riavvii gli scraper (max 4 min)"
for i in $(seq 1 16); do
  h=$(git -C /opt/withus-backend rev-parse --short HEAD)
  [ "$h" != "da7ab03" ] && { echo "aggiornato a $h alle $(date '+%T')"; break; }
  sleep 15
done
sleep 45
echo "== servizi"
for s in withus-backend axa-scraper groupama-scraper; do printf '%-20s %s  da: %s\n' "$s" "$(systemctl is-active $s)" "$(systemctl show -p ActiveEnterTimestamp --value $s)"; done
echo "== la porta 3000 adesso"
ss -lntp 2>/dev/null | grep ':3000'
curl -s -m 8 http://127.0.0.1:3000/health; echo
echo "== LE SESSIONI HANNO RETTO IL RIAVVIO?"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 10 "http://127.0.0.1:$2/loginstate" | head -c 220; echo; done
echo "== cosa dicono i giornali"
journalctl -u axa-scraper --since '-5min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'sessione|SIGTERM|login|ripresa' | tail -8
journalctl -u groupama-scraper --since '-5min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'sessione|SIGTERM|login|ripresa' | tail -8
