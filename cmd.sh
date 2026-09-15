echo "aspetto che autopull prenda 7844b5b e riavvii AXA (max 4 min)"
for i in $(seq 1 16); do h=$(git -C /opt/withus-backend rev-parse --short HEAD); [ "$h" = "7844b5b" ] && { echo "aggiornato a $h alle $(date '+%T')"; break; }; sleep 15; done
echo "aspetto il riavvio dello scraper e la sua decisione"
for i in $(seq 1 10); do
  a=$(systemctl show -p ActiveEnterTimestamp --value axa-scraper)
  case "$a" in *"$(date '+%Y-%m-%d')"*) ;; esac
  sleep 15
done
echo "== servizio AXA avviato alle: $(systemctl show -p ActiveEnterTimestamp --value axa-scraper)"
echo "== il codice nuovo c'è?"; grep -c "attendiAccesso(loggedMarker" /opt/withus-backend/scraper/axa/quote-service.mjs
echo "== stato"; curl -s -m 12 http://127.0.0.1:4700/loginstate | head -c 200; echo
echo "== giornale dello scraper dal riavvio"
journalctl -u axa-scraper --since '-6min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'sessione|rimbalzo|PRONTO|rientrat|persistente|telecomando' | tail -10
