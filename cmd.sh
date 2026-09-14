echo "== stato PRIMA del rilascio"; date '+%T'
curl -s -m 10 http://127.0.0.1:4700/loginstate | head -c 140; echo
echo "aspetto che autopull prenda il codice nuovo (max 4 min)"
for i in $(seq 1 16); do h=$(git -C /opt/withus-backend rev-parse --short HEAD); [ "$h" = "c7800a7" ] && { echo "aggiornato a $h alle $(date '+%T')"; break; }; sleep 15; done
echo "aspetto che AXA si riaccenda e decida (60s)"; sleep 60
echo "== LA PROVA: AXA ha superato il riavvio da sola?"
curl -s -m 10 http://127.0.0.1:4700/loginstate | head -c 220; echo
echo "== cosa dice il giornale"
journalctl -u axa-scraper --since '-6min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'sessione|rimbalzo|SIGTERM|rientrat|PRONTO|persistente' | tail -10
echo "== e Allianz? (deve aver preso i 60 secondi di attesa)"
grep -c "GIRI_OFFERTA = 30" /opt/withus-backend/scraper/allianz/quote-service.mjs
