echo "== chi ascolta verso l'esterno"
ss -lntp 2>/dev/null | grep -vE '127\.0\.0\.1|\[::1\]' | head -15
echo "== servizi web attivi"
systemctl list-units --type=service --state=running --no-pager 2>/dev/null | grep -iE 'nginx|caddy|apache|httpd|traefik|cloudflared|tunnel' || echo "nessun proxy web fra i servizi attivi"
echo "== caddy?"
ls -l /etc/caddy/Caddyfile 2>/dev/null && grep -nE "timeout|reverse_proxy" /etc/caddy/Caddyfile 2>/dev/null | head -20
echo "== cloudflared?"
ls /etc/cloudflared/ 2>/dev/null; cat /etc/cloudflared/config.yml 2>/dev/null | head -20
echo "== a chi punta il frontend (config pubblica)"
grep -rhoE "https?://[a-z0-9.-]*withus[a-z0-9.-]*[^\"' ]*" /opt/withus-backend/index.html 2>/dev/null | sort -u | head -10
