echo "== ora"; date '+%F %T %Z'
echo "== FERMO SUBITO groupama: sta girando in tondo"
systemctl stop groupama-scraper.service 2>&1
sleep 2
echo -n "stato: "; systemctl is-active groupama-scraper.service 2>&1
echo -n "porta 4500: "; curl -s --max-time 5 http://127.0.0.1:4500/loginstate || echo "muta"
echo
echo "== che cosa faceva: giornale groupama, ultimi 40 minuti, SENZA filtri"
journalctl -u groupama-scraper --since "-40 min" --no-pager -o short 2>/dev/null | tail -30
echo
echo "== e il backend: righe su otp/codice/conferma, ultimi 40 minuti"
journalctl -u withus-backend --since "-40 min" --no-pager -o cat 2>/dev/null | grep -iE "otp|codice|conferma|resend|accedi" | tail -25
