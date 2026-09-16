for i in $(seq 1 36); do H=$(git -C /opt/withus-backend rev-parse --short HEAD); [ "$H" = "8123865" ] && break; sleep 5; done
echo "== HEAD backend: $H (atteso 8123865) dopo ~$((i*5)) s"
sleep 8
echo "== iam/ sul disco: $(ls /opt/withus-backend/iam 2>/dev/null | wc -l) file; index: $(stat -c '%a %U' /opt/withus-backend/iam/index.html 2>/dev/null)"
echo "== autopull, righe Caddy/impianto:"; journalctl -u withus-autopull --since '-5min' --no-pager 2>/dev/null | grep -E 'Caddy|ATTENZIONE|aggiorno' | tail -6 | cut -c1-200
echo "== /etc/caddy/withus/iam.caddy → root IAM: $(grep -o 'root \* /opt/withus-backend/iam' /etc/caddy/withus/iam.caddy | head -1)"
echo "== configurazione in esecuzione contiene /opt/withus-backend/iam: $(curl -s -m 5 http://127.0.0.1:2019/config/ | grep -o '/opt/withus-backend/iam' | wc -l) volte; /opt/withus-iam: $(curl -s -m 5 http://127.0.0.1:2019/config/ | grep -o '/opt/withus-iam' | wc -l)"
R() { curl -s -o /dev/null -w '%{http_code}' -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 "https://iam.withusassicurazioni.it$1"; }
echo "IAM /=$(R /) js=$(R /withus-one.js?v=20260916a) | nascosti verifica=$(R /verifica/fonti.test.mjs) sql=$(R /sql/) .gitignore=$(R /.gitignore) CLAUDE.md=$(R /CLAUDE.md)"
echo "QUOTO /nuovo-preventivo/=$(R /nuovo-preventivo/) motore=$(R /nuovo-preventivo/tariffe/motore/amtrust.js) | /nuovo-preventivo/iam/=$(R /nuovo-preventivo/iam/) (404 atteso)"
echo "servizi /health=$(R /health) api.=$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health)"
echo "md5 IAM servito / iam/ nel repo / vecchio clone: $(curl -s -m 10 --resolve iam.withusassicurazioni.it:443:127.0.0.1 https://iam.withusassicurazioni.it/ | md5sum | cut -c1-8) / $(md5sum /opt/withus-backend/iam/index.html | cut -c1-8) / $(md5sum /opt/withus-iam/index.html 2>/dev/null | cut -c1-8)"
echo "== caddy: $(systemctl is-active caddy)  backend: $(systemctl is-active withus-backend)"
