echo "== ora"; date '+%F %T %Z'
echo "== GROUPAMA: e' ancora sospeso da me?"
ls -1 /root/servizi-sospesi/ 2>/dev/null
echo -n "unita' presente in /etc/systemd/system? "; [ -f /etc/systemd/system/groupama-scraper.service ] && echo "SI (qualcuno l'ha rimessa)" || echo "no, ancora sospesa"
echo -n "risponde sulla 4500? "; curl -s --max-time 5 http://127.0.0.1:4500/loginstate || echo "no, fermo"
echo
echo "== gli altri scraper e il backend"
for n in moto allianz italiana hdi axa; do printf '%-10s %s\n' "$n" "$(systemctl is-active $n-scraper.service 2>/dev/null)"; done
printf '%-10s %s\n' "backend" "$(systemctl is-active withus-backend 2>/dev/null)"
echo
echo "== stato di chi e' su"
for p in allianz:4200 hdi:4400 axa:4700; do n=${p%%:*}; k=${p##*:}; printf '%-10s ' "$n"; curl -s --max-time 5 http://127.0.0.1:$k/loginstate | head -c 160; echo; done
echo
echo "== richieste di codice nelle ultime 24 ore, su TUTTI gli scraper"
journalctl --since "-24 hours" --no-pager 2>/dev/null | grep -cE "schermata OTP raggiunta" | sed 's/^/codici chiesti: /'
echo "== email mandate dal sistema nelle ultime 24 ore"
journalctl --since "-24 hours" --no-pager 2>/dev/null | grep -c "email inviata" | sed 's/^/email della vigilanza: /'
echo
echo "== commit vivo"; cd /opt/withus-backend && git log --oneline -1
