echo "== ora"; date '+%F %T'
echo "== giornale groupama, dalle 18:00"
journalctl -u groupama-scraper --since "today 18:00" --no-pager -o short 2>/dev/null | grep -v "ERROR:" | tail -25
echo
echo "== backend: righe su groupama / otp-posta / vigilanza, dalle 18:00"
journalctl -u withus-backend --since "today 18:00" --no-pager -o cat 2>/dev/null | grep -iE "otp-posta|groupama|vigilanza|fermo al codice|codice dalla posta" | tail -30
echo
echo "== la vigilanza con rientro e' accesa?"
systemctl show withus-backend -p Environment --no-pager 2>/dev/null | tr ' ' '\n' | grep -iE "FONTI_|OTP_|POSTA_" | sed -E 's/(PASS|TOKEN|KEY|SECRET)[A-Z_]*=.*/\1***/'
