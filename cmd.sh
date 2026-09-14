echo "== c'è un proxy davanti al backend?"
ls /etc/nginx/sites-enabled/ 2>/dev/null
echo "-- timeout configurati --"
grep -rnE "proxy_read_timeout|proxy_connect_timeout|proxy_send_timeout|keepalive_timeout|send_timeout" /etc/nginx/ 2>/dev/null | head -20
echo "-- blocchi che inoltrano al backend --"
grep -rn "proxy_pass" /etc/nginx/sites-enabled/ 2>/dev/null | head -10
echo
echo "== timeout lato backend verso gli scraper"
grep -rnE "timeout: *[0-9]{4,}|AbortSignal.timeout\([0-9]+\)|setTimeout\(.*[0-9]{5,}" /opt/withus-backend/server/moto.js 2>/dev/null | head -12
