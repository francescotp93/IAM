echo "== ora: $(date '+%F %T')  host: $(hostname)"
echo "== caddy: $(caddy version 2>/dev/null | head -1)  stato: $(systemctl is-active caddy 2>/dev/null)  enabled: $(systemctl is-enabled caddy 2>/dev/null)"
echo "== unit caddy (ProtectSystem, ExecReload):"; systemctl cat caddy 2>/dev/null | grep -E '^(ExecStart|ExecReload|ProtectSystem|ReadWritePaths|User)=' | head -8
echo "== /etc/caddy/Caddyfile ($(wc -c < /etc/caddy/Caddyfile 2>/dev/null) byte):"; sed 's/\t/    /g' /etc/caddy/Caddyfile 2>/dev/null
echo "== copie: $(ls /etc/caddy/Caddyfile.buona-* /etc/caddy/Caddyfile.bak* 2>/dev/null | wc -l)"; ls -la /etc/caddy/ 2>/dev/null | head -12
echo "== chi ascolta su 80/443:"; ss -ltnp 2>/dev/null | grep -E ':(80|443) ' | sed 's/  */ /g'
echo "== /opt/withus-iam: $(git -C /opt/withus-iam rev-parse --short HEAD 2>/dev/null) $(git -C /opt/withus-iam log -1 --format='%ci' 2>/dev/null)  file: $(ls /opt/withus-iam 2>/dev/null | wc -l)  owner: $(stat -c '%U:%G %a' /opt/withus-iam 2>/dev/null)"
echo "== /opt/withus-backend: $(git -C /opt/withus-backend rev-parse --short HEAD) owner: $(stat -c '%U:%G %a' /opt/withus-backend) index.html: $(stat -c '%U %a' /opt/withus-backend/index.html 2>/dev/null)"
echo "== caddy puo' leggere? (utente del servizio)"; U=$(systemctl show -p User --value caddy 2>/dev/null); echo "utente: ${U:-root}"; [ -n "$U" ] && { sudo -u "$U" test -r /opt/withus-iam/index.html && echo "iam/index.html leggibile da $U" || echo "iam/index.html NON leggibile da $U"; sudo -u "$U" test -r /opt/withus-backend/index.html && echo "quoto/index.html leggibile da $U" || echo "quoto/index.html NON leggibile da $U"; }
echo "== segnalini setup.d:"; ls /var/lib/withus-autopull/ 2>/dev/null
echo "== risposta locale con Host iam. (oggi dovrebbe essere il blocco di default o niente):"; curl -s -o /dev/null -w 'http:%{http_code} ' -m 8 -H 'Host: iam.withusassicurazioni.it' http://127.0.0.1/; curl -sk -o /dev/null -w 'https:%{http_code}\n' -m 8 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/
echo "== api health: $(curl -s -m 8 -o /dev/null -w '%{http_code}' https://api.withusassicurazioni.it/health)"
echo "== backend in ascolto: $(ss -ltn 2>/dev/null | grep -c ':3000 ')"
echo "== .env CORS_ORIGINS impostato? $(grep -c '^CORS_ORIGINS=' /opt/withus-backend/server/.env 2>/dev/null)"
echo "== spazio disco: $(df -h / | tail -1 | awk '{print $4" liberi su "$2}')"
