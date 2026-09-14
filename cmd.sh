echo "== Caddyfile completo (74 byte)"
cat /etc/caddy/Caddyfile
echo
echo "== versione Caddy"
caddy version 2>/dev/null || /usr/bin/caddy version 2>/dev/null
echo
echo "== cosa ha registrato Caddy per le quotazioni lente (09-11 settembre)"
journalctl -u caddy --since '2026-09-09' --until '2026-09-12' --no-pager 2>/dev/null | grep -a '/moto/premio' | tail -20
echo
echo "== la porta 3000 è aperta verso l'esterno?"
ufw status 2>/dev/null | head -12
iptables -S 2>/dev/null | grep -iE '3000|DROP|REJECT' | head -10
