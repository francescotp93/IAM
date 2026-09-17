echo "== ora"; date '+%F %T %Z'
echo "== quante email ha mandato LA VIGILANZA, e a chi (ultime 2 ore)"
journalctl -u withus-backend --since "-2 hours" --no-pager -o cat 2>/dev/null | grep -c "email inviata" | sed 's/^/email inviate dalla vigilanza: /'
journalctl -u withus-backend --since "-2 hours" --no-pager -o short 2>/dev/null | grep "email inviata" | sed -E 's/@[^ ]*/@.../' | tail -20
echo
echo "== e i giri della vigilanza: quante volte ha visto una caduta"
journalctl -u withus-backend --since "-2 hours" --no-pager -o cat 2>/dev/null | grep "vigilanza-fonti] giro" | tail -12
echo
echo "== adesso che groupama e' fermo, cosa dice la vigilanza"
journalctl -u withus-backend --since "-3 min" --no-pager -o cat 2>/dev/null | tail -10
