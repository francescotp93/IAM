echo "== ora"; date '+%F %T'
git -C /opt/withus-backend log --oneline -1
journalctl -u withus-autopull --since '-8min' --no-pager 2>/dev/null | grep -aE 'aggiorno|riavviat' | tail -5
echo "== la riga nuova è nel file in produzione?"
grep -c "motivoSemeNonValido(cPrima.totpSecret)" /opt/withus-backend/scraper/axa/quote-service.mjs
echo "== le sessioni hanno retto il riavvio?"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 8 "http://127.0.0.1:$2/loginstate" | head -c 200; echo; done
for c in axa groupama; do f=/opt/withus-backend/scraper/$c/auth.json; [ -f "$f" ] && printf '%-9s auth.json %s\n' "$c" "$(date -r "$f" '+%F %T')"; done
