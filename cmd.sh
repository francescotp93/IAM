set +e
echo "=== login per compagnia (/status) ==="
for p in 4100 4200 4300 4400 4500 4700; do
  printf 'porta %s: ' "$p"
  curl -s -m 8 "http://127.0.0.1:$p/status" 2>/dev/null | head -c 400
  echo
done
echo "=== groupama: righe col 'codice' nelle ultime 24h ==="
journalctl -u groupama-scraper.service --since "-24 hours" --no-pager 2>/dev/null | grep -i "codice" | tail -20
echo "=== groupama: ultime 25 righe del giornale ==="
journalctl -u groupama-scraper.service --since "-24 hours" --no-pager 2>/dev/null | tail -25
echo "=== quante volte groupama e' ripartito nelle ultime 24h ==="
journalctl -u groupama-scraper.service --since "-24 hours" --no-pager 2>/dev/null | grep -c "Started"
