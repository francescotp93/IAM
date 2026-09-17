echo "== ora"; date '+%F %T %Z'
echo "== stato prima"; systemctl is-active groupama-scraper.service 2>&1
echo "== lo blocco perche' non possa piu' essere riacceso da autopull"
systemctl stop groupama-scraper.service 2>&1
systemctl mask groupama-scraper.service 2>&1
sleep 2
echo -n "stato: "; systemctl is-active groupama-scraper.service 2>&1
echo -n "risponde sulla 4500? "; curl -s --max-time 5 http://127.0.0.1:4500/loginstate || echo "no"
echo
echo "== controprova: chiedo di riavviarlo, DEVE rifiutare"
systemctl start groupama-scraper.service 2>&1 | head -3
echo -n "stato dopo il tentativo: "; systemctl is-active groupama-scraper.service 2>&1
echo
echo "== gli altri scraper restano su?"
for n in moto allianz italiana hdi axa; do printf '%-10s %s\n' "$n" "$(systemctl is-active $n-scraper.service 2>/dev/null)"; done
printf '%-10s %s\n' "backend" "$(systemctl is-active withus-backend 2>/dev/null)"
