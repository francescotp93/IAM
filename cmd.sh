echo "== ora"; date '+%F %T'
echo "== il backend ha ricevuto richieste su /fonti negli ultimi 25 minuti?"
journalctl -u withus-backend --since '-25min' --no-pager -o short-iso 2>/dev/null | grep -aE '/fonti' | tail -25
echo
echo "== errori del backend"
journalctl -u withus-backend --since '-25min' --no-pager -o short-iso 2>/dev/null | grep -aiE 'error|errore|ECONN|refused|timeout|401|403|502' | tail -15
echo
echo "== e Caddy cosa ha visto arrivare? (registro nuovo)"
journalctl -u caddy --since '-25min' --no-pager 2>/dev/null | grep -a 'handled request' | grep -aoE '"method":"[A-Z]+","host":"[^"]*","uri":"[^"]*"|"status":[0-9]+|"duration":[0-9.]+' | paste - - - 2>/dev/null | tail -25
