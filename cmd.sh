f=/opt/withus-backend/scraper/axa/auth.json
echo "ora: $(date '+%T')  ultimo salvataggio axa: $(date -r $f '+%T')  (età: $(( ($(date +%s) - $(date -r $f +%s)) / 60 )) minuti)"
echo "aspetto il prossimo salvataggio periodico, al massimo 4 minuti"
prima=$(date -r $f +%s)
for i in $(seq 1 16); do
  sleep 15
  ora=$(date -r $f +%s)
  if [ "$ora" != "$prima" ]; then echo "SALVATO ADESSO alle $(date -r $f '+%T') — è il momento buono per rilasciare"; break; fi
done
[ "$(date -r $f +%s)" = "$prima" ] && echo "nessun salvataggio in questi 4 minuti (ultimo: $(date -r $f '+%T'))"
git -C /opt/withus-backend log --oneline -1
