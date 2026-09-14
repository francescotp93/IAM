echo "== ora"; date '+%F %T'
echo "== HEAD + autopull"
git -C /opt/withus-backend log --oneline -1
journalctl -u withus-autopull --since '-15min' --no-pager 2>/dev/null | tail -10
echo "== da quanto girano i servizi (nessun riavvio = sessione caduta da sola)"
for s in axa-scraper groupama-scraper; do printf '%-18s %s\n' "$s" "$(systemctl show -p ActiveEnterTimestamp --value $s)"; done
echo "== AXA: come e quando è caduta"
journalctl -u axa-scraper --since '-3h' --no-pager 2>/dev/null | grep -aiE 'caduta|scadut|keep-alive|relogin|login|sessione' | tail -15
echo "== GROUPAMA: caduta e codice automatico dalla posta"
journalctl -u groupama-scraper --since '-3h' --no-pager 2>/dev/null | grep -aiE 'caduta|scadut|keep-alive|codice|posta|otp|login|sessione' | tail -20
echo "== il backend ha provato a prendere il codice dalla posta?"
journalctl -u withus-backend --since '-30min' --no-pager 2>/dev/null | grep -aiE 'codice|posta|otp|imap' | tail -15
