set +e
echo "=== hdi: quante righe in 24h, per tipo ==="
J=$(journalctl -u hdi-scraper.service --since "-24 hours" --no-pager 2>/dev/null)
echo "righe totali:        $(echo "$J" | wc -l)"
echo "watchdog: salto:     $(echo "$J" | grep -c 'watchdog: salto')"
echo "watchdog altro:      $(echo "$J" | grep 'watchdog' | grep -vc 'salto')"
echo "keep-alive:          $(echo "$J" | grep -c 'keep-alive')"
echo "UEFA token:          $(echo "$J" | grep -c 'UEFA')"
echo "login -> :           $(echo "$J" | grep -c 'login →')"
echo "freno/brake:         $(echo "$J" | grep -ciE 'freno|rifiutat|bloccat')"
echo "--- le prime 8 righe della finestra ---"
echo "$J" | head -8
echo "--- ogni riga NON watchdog, ultime 30 ---"
echo "$J" | grep -v 'watchdog: salto' | tail -30
echo "=== da quanto gira il servizio ==="
systemctl show hdi-scraper.service -p ActiveEnterTimestamp
