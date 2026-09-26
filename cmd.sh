set +e
echo "=== data ==="; date -u
echo "=== servizi ==="
for s in withus-backend groupama-scraper axa-scraper hdi-scraper italiana-scraper allianz-scraper moto-scraper; do
  printf '%-24s %s\n' "$s" "$(systemctl is-active $s.service 2>/dev/null) / $(systemctl is-enabled $s.service 2>/dev/null)"
done
echo "=== stato login scraper (porte locali) ==="
for p in 4100 4200 4300 4400 4500 4700; do
  printf 'porta %s: ' "$p"
  curl -s -m 6 "http://127.0.0.1:$p/stato" 2>/dev/null | head -c 300
  echo
done
echo "=== mail groupama nelle ultime 24h (conteggio dal giornale) ==="
journalctl -u groupama-scraper.service --since "-24 hours" --no-pager 2>/dev/null | grep -ci "codice" 
echo "=== righe di errore backend ultime 12h ==="
journalctl -u withus-backend.service --since "-12 hours" --no-pager 2>/dev/null | grep -ciE "error|errore|fail"
