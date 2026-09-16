for i in $(seq 1 30); do H=$(git -C /opt/withus-iam rev-parse --short HEAD); [ "$H" = "1a90581" ] && break; sleep 5; done
echo "== /opt/withus-iam HEAD: $H (atteso 1a90581) dopo ~$((i*5)) s"
R() { curl -s -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it$1"; }
echo "== withus-one.js servito: $(R /withus-one.js?v=20260916a | grep -o "var QUOTO = '[^']*'")"
echo "== index.html servito: $(R / | grep -o "const QUOTO_URL = '[^']*'")  tag: $(R / | grep -o 'withus-one.js?v=[0-9a-z]*')"
echo "== riquadro: $(curl -s -o /dev/null -w '%{http_code}' -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 'https://iam.withusassicurazioni.it/nuovo-preventivo/?from=iam&page=rcprof&prod=rcp_tecnici_geometri')"
echo "== caddy: $(systemctl is-active caddy)  api: $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health)"
echo "== richieste a iam. nel registro (ultimi 10 min): $(journalctl -u caddy --since '-10min' --no-pager -o cat 2>/dev/null | grep -c 'handled request')"
