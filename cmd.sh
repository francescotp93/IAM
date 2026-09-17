echo "== ora"; date '+%F %T %Z'
echo "== 1. metto da parte il file del servizio (si rimette dov'era in un secondo)"
mkdir -p /root/servizi-sospesi
if [ -f /etc/systemd/system/groupama-scraper.service ]; then
  cp -a /etc/systemd/system/groupama-scraper.service /root/servizi-sospesi/groupama-scraper.service
  echo "copia di sicurezza: /root/servizi-sospesi/groupama-scraper.service"
  systemctl stop groupama-scraper.service 2>&1
  mv /etc/systemd/system/groupama-scraper.service /root/servizi-sospesi/groupama-scraper.service.SOSPESO
  systemctl daemon-reload
  echo "file spostato"
else
  echo "ATTENZIONE: il file non e' dove pensavo, non tocco niente"
fi
sleep 2
echo
echo "== 2. CONTROPROVA: provo ad accenderlo, DEVE fallire"
systemctl start groupama-scraper.service 2>&1 | head -3
echo -n "stato: "; systemctl is-active groupama-scraper.service 2>&1
echo -n "risponde sulla 4500? "; curl -s --max-time 5 http://127.0.0.1:4500/loginstate || echo "NO — e' fermo"
echo
echo "== 3. QUANTE VOLTE HA CHIESTO UN CODICE OGGI, e a ogni riavvio"
journalctl -u groupama-scraper --since "today" --no-pager -o short 2>/dev/null | grep -cE "schermata OTP raggiunta" | sed 's/^/codici chiesti oggi: /'
journalctl -u groupama-scraper --since "today" --no-pager -o short 2>/dev/null | grep -E "schermata OTP raggiunta|Started groupama|rientro automatico: provo" | tail -30
echo
echo "== 4. gli altri restano su"
for n in moto allianz italiana hdi axa; do printf '%-10s %s\n' "$n" "$(systemctl is-active $n-scraper.service 2>/dev/null)"; done
printf '%-10s %s\n' "backend" "$(systemctl is-active withus-backend 2>/dev/null)"
