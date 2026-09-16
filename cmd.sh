echo "== ora: $(date '+%F %T')"
# aspetto che l'autopull abbia tirato il commit c479f7b ed eseguito l'impianto (max ~3 min)
for i in $(seq 1 36); do
  H=$(git -C /opt/withus-backend rev-parse --short HEAD 2>/dev/null)
  if [ -f /var/lib/withus-autopull/20-dominio-unico-caddy.sh.log ] && [ "$H" = "c479f7b" ]; then break; fi
  sleep 5
done
echo "== HEAD backend: $(git -C /opt/withus-backend rev-parse --short HEAD)  (atteso c479f7b)"
echo "== segnalini:"; ls /var/lib/withus-autopull/ | grep 20-dominio
echo "== LOG impianto:"; cat /var/lib/withus-autopull/20-dominio-unico-caddy.sh.log 2>/dev/null || echo "(nessun log ancora)"
echo "== autopull, ultime righe utili:"; journalctl -u withus-autopull --since '-6min' --no-pager 2>/dev/null | grep -E 'autopull\]' | tail -12
echo "== caddy: $(systemctl is-active caddy)"
echo "== Caddyfile, ultime 4 righe:"; tail -4 /etc/caddy/Caddyfile
echo "== /etc/caddy/withus:"; ls -la /etc/caddy/withus 2>/dev/null
echo "== api health: $(curl -s -m 10 -o /dev/null -w '%{http_code}' https://api.withusassicurazioni.it/health)"
echo "== configurazione in esecuzione contiene iam.: $(curl -s -m 5 http://127.0.0.1:2019/config/ | grep -o 'iam.withusassicurazioni.it' | wc -l) volte"
echo "== http con Host iam. → $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -m 8 -H 'Host: iam.withusassicurazioni.it' http://127.0.0.1/)"
echo "== giornale caddy sul certificato di iam. (ultimi 5 min):"; journalctl -u caddy --since '-5min' --no-pager -o cat 2>/dev/null | grep -i 'iam.withus' | grep -iE 'obtain|error|challenge|retry' | tail -6 | cut -c1-300
