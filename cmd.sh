echo "== ora"; date '+%F %T'
sleep 120
cd /opt/withus-backend
echo "== commit vivo"; git log --oneline -1
echo "== la password e' ancora nel messaggio di avvio?"
grep -l 'password: \$VNC_PASS' scraper/*/start-service.sh 2>/dev/null || echo "in nessuno: pulito"
echo "== come sta ogni scraper"
for p in moto:4100 allianz:4200 italiana:4300 hdi:4400 groupama:4500 axa:4700; do
  n=${p%%:*}; k=${p##*:}
  printf '%-10s ' "$n"
  systemctl is-active $n-scraper.service 2>/dev/null | tr -d '\n'
  printf ' | '
  curl -s --max-time 6 http://127.0.0.1:$k/loginstate || echo -n '(non risponde)'
  echo
done
echo "== la password compare ancora nel diario dopo il riavvio?"
journalctl --since "-4 min" --no-pager 2>/dev/null | grep -c "password:" | sed 's/^/righe con "password:" negli ultimi 4 minuti: /'
