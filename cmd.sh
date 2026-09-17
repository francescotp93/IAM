echo "== ora"; date '+%F %T'
echo "== scheda del servizio"
systemctl show notifica-telegram --no-pager -p FragmentPath -p Description -p ExecStart -p Type -p Restart -p ActiveEnterTimestamp -p InactiveEnterTimestamp -p ExecMainStartTimestamp -p ExecMainExitTimestamp -p NRestarts -p Result 2>&1
echo "== file dell'unita' (senza righe di ambiente)"
F=$(systemctl show notifica-telegram -p FragmentPath --value 2>/dev/null)
if [ -n "$F" ] && [ -f "$F" ]; then sed -e 's/\(TOKEN[^=]*=\).*/\1***/I' -e 's/\(KEY[^=]*=\).*/\1***/I' -e 's/\(PASS[^=]*=\).*/\1***/I' -e 's/\(SECRET[^=]*=\).*/\1***/I' "$F"; else echo "nessun file"; fi
echo "== prima e ultima traccia nel diario (tutta la storia disponibile)"
journalctl -u notifica-telegram --no-pager -o short -n 1 2>/dev/null
echo "   ---"
journalctl -u notifica-telegram --no-pager -o short 2>/dev/null | head -3
echo "== ultime 25 righe"
journalctl -u notifica-telegram --no-pager -o short 2>/dev/null | tail -25
echo "== quanto indietro arriva il diario"
journalctl --no-pager -o short -n 1 --since "@0" 2>/dev/null | head -1
