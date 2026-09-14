echo "== ora"; date '+%F %T'
echo "== da quanto girano"; for s in withus-backend axa-scraper allianz-scraper groupama-scraper; do printf '%-18s %s\n' "$s" "$(systemctl show -p ActiveEnterTimestamp --value $s)"; done
echo "== cosa ha fatto autopull negli ultimi 15 minuti"
journalctl -u withus-autopull --since '-15min' --no-pager 2>/dev/null | grep -aE 'aggiorno|riavviat|fatto|cambiato' | tail -12
echo "== il codice nuovo è nel file dello scraper AXA?"
grep -c "attendiAccesso" /opt/withus-backend/scraper/axa/quote-service.mjs
echo "== quale versione sta ESEGUENDO il processo (data del file vs avvio del servizio)"
stat -c '%y  scraper axa sul disco' /opt/withus-backend/scraper/axa/quote-service.mjs
