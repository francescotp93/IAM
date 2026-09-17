echo "== ora e fuso del server"; date '+%F %T %Z (%z)'
echo
echo "== CONTROPROVA: la finestra di tempo funziona? quante righe in tutto"
echo -n "tutto il diario, ultimi 70 minuti: "
journalctl --since "-70 min" --no-pager 2>/dev/null | wc -l
echo -n "tutto il diario, dalle 08:00 di oggi:  "
journalctl --since "today 08:00" --no-pager 2>/dev/null | wc -l
echo -n "  di cui con 'password: ':            "
journalctl --since "today 08:00" --no-pager 2>/dev/null | grep -c "password: "
echo
echo "== groupama, ultimi 70 minuti, SENZA filtri"
journalctl -u groupama-scraper --since "-70 min" --no-pager -o short 2>/dev/null | wc -l | sed 's/^/righe totali: /'
journalctl -u groupama-scraper --since "-70 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -20
echo
echo "== backend, ultimi 70 minuti"
journalctl -u withus-backend --since "-70 min" --no-pager -o cat 2>/dev/null | wc -l | sed 's/^/righe totali: /'
journalctl -u withus-backend --since "-70 min" --no-pager -o cat 2>/dev/null | grep -iE "otp|posta|groupama|vigilanza" | tail -20
echo
echo "== da dove prende le variabili il backend"
systemctl show withus-backend -p EnvironmentFiles --no-pager 2>/dev/null
for f in /etc/withus-backend.env /opt/withus-backend/.env; do
  [ -f "$f" ] && { echo "--- $f (solo i nomi delle variabili) ---"; grep -oE '^[A-Z_]+' "$f" | sort; }
done
