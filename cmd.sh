D=/var/lib/withus/archivio
echo "== i file cifrati sul disco =="
find "$D" -name '*.bin' -printf '%p\n  %s byte  %TY-%Tm-%Td %TH:%TM  utente %u:%g  permessi %m\n' 2>/dev/null
echo "totale: $(find "$D" -name '*.bin' 2>/dev/null | wc -l)"
echo
echo "== e' davvero cifrato col nostro formato? =="
for f in $(find "$D" -name '*.bin' 2>/dev/null | head -3); do
  printf 'sigla in testa: '; head -c 4 "$f"; echo
  echo "occorrenze di %PDF nel file (deve essere 0): $(grep -c '%PDF' "$f" 2>/dev/null || echo 0)"
done
echo
echo "== residui della prova d'avvio (deve essere vuoto) =="
ls -A "$D" | grep -v '^[0-9a-f][0-9a-f]$' || echo "(nessuno)"
echo
echo "== errori dell'archivio nell'ultima mezz'ora =="
journalctl -u withus-backend --since "-30 min" --no-pager 2>/dev/null | grep -i "archivio" | tail -5 || echo "(nessuno)"
