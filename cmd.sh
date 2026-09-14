set -u
F=/etc/caddy/Caddyfile
B=$(ls -1t /etc/caddy/Caddyfile.bak-* 2>/dev/null | head -1)
echo "== PRIMA DI TUTTO: rimetto la configurazione che funziona ($B)"
cp -a "$B" "$F" && systemctl reload caddy && echo "ripristinata e ricaricata"
echo "health: HTTP $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health)"
echo "sul disco adesso c'e':"; cat "$F"
echo
echo "== PERCHE' IL RICARICAMENTO ERA FALLITO"
journalctl -u caddy --since '-10min' --no-pager 2>/dev/null | grep -aiE 'error|fail|denied|permission|unrecognized|invalid' | tail -15
echo "== il servizio puo' scrivere in /var/log?"
systemctl show caddy -p ProtectSystem -p ReadWritePaths -p LogsDirectory -p User 2>/dev/null
ls -ld /var/log/caddy 2>/dev/null
