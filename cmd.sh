echo "== ora"; date '+%F %T'
cd /opt/withus-backend
echo "== commit vivo"; git log --oneline -1
echo "== la password e' ancora in qualche messaggio di avvio?"
grep -l 'password: \$VNC_PASS' scraper/*/start-service.sh 2>/dev/null || echo "in nessuno: pulito"
echo "== righe col testo 'password:' nel diario dalle 08:00 di oggi"
journalctl --since "today 08:00" --no-pager 2>/dev/null | grep -c "password: " 
echo "== come sta ogni scraper"
for p in moto:4100 allianz:4200 italiana:4300 hdi:4400 groupama:4500 axa:4700; do
  n=${p%%:*}; k=${p##*:}
  printf '%-10s ' "$n"
  systemctl is-active $n-scraper.service 2>/dev/null | tr -d '\n'
  printf ' | '
  curl -s --max-time 6 http://127.0.0.1:$k/loginstate || printf '(non risponde)'
  echo
done
echo "== backend"; systemctl is-active withus-backend
