echo "== ora"; date '+%F %T %Z'
echo "== TUTTO il diario degli ultimi 25 minuti che parla di posta/invii"
journalctl --since "-25 min" --no-pager -o short 2>/dev/null \
  | grep -iE "brevo|sendmail|smtp|email inviata|mail inviata|invio|otp|codice" \
  | sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/…@…/g' | tail -30
echo
echo "== stato dei sei scraper adesso"
for p in moto:4100 allianz:4200 italiana:4300 hdi:4400 groupama:4500 axa:4700; do
  n=${p%%:*}; k=${p##*:}
  printf '%-10s %-9s ' "$n" "$(systemctl is-active $n-scraper.service 2>/dev/null)"
  curl -s --max-time 5 http://127.0.0.1:$k/loginstate | head -c 200 || printf '(fermo)'
  echo
done
echo
echo "== qualcuno ha chiesto un accesso negli ultimi 25 minuti?"
journalctl --since "-25 min" --no-pager -o short 2>/dev/null | grep -iE "accedi|login|schermata OTP|fill user" | tail -15
echo
echo "== i timer attivi (qualcosa che gira da solo a ripetizione)"
systemctl list-timers --all --no-pager --no-legend 2>/dev/null | awk '{print $NF, $1}' | grep -viE "apt|man-db|logrotate|fstrim|e2scrub|motd|dpkg|sysstat|update-notifier|ua-timer|snapd" | head -12
