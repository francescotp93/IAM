set +e
echo "=== allianz 4200 stato completo ==="
curl -s -m 8 "http://127.0.0.1:4200/status" 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s -m 8 "http://127.0.0.1:4200/status"
echo
echo "=== hdi 4400 stato completo ==="
curl -s -m 8 "http://127.0.0.1:4400/status" 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s -m 8 "http://127.0.0.1:4400/status"
echo
echo "=== hdi: ultime 15 righe ==="
journalctl -u hdi-scraper.service --since "-24 hours" --no-pager 2>/dev/null | tail -15
echo "=== allianz: ultime 15 righe ==="
journalctl -u allianz-scraper.service --since "-24 hours" --no-pager 2>/dev/null | tail -15
