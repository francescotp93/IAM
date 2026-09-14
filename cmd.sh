echo "== ora"; date '+%F %T'
echo "== chiamate di quotazione ricevute dal backend, per giorno (ultimi 7 giorni)"
journalctl -u withus-backend --since '-7 days' --no-pager -o short-iso 2>/dev/null \
 | grep -aiE '/premio|/quote/|quotazion|preventiv' \
 | awk '{print substr($1,1,10)}' | sort | uniq -c
echo
echo "== ultime 60 righe che parlano di premi/quotazioni"
journalctl -u withus-backend --since '-7 days' --no-pager -o short-iso 2>/dev/null \
 | grep -aiE '/premio|/quote/|quotazion|esito|registraEsito' | tail -60
echo
echo "== errori del backend negli ultimi 7 giorni (ultimi 40)"
journalctl -u withus-backend --since '-7 days' --no-pager -o short-iso -p err 2>/dev/null | tail -40
