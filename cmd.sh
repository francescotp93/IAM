echo "== variabili d'ambiente del backend: PRESENZA e LUNGHEZZA, mai il valore =="
for v in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_SERVICE_KEY ARCHIVIO_CHIAVE ARCHIVIO_DIR; do
  val=$(systemctl show withus-backend -p Environment 2>/dev/null | tr ' ' '\n' | grep "^${v}=" | head -1 | cut -d= -f2-)
  if [ -n "$val" ]; then echo "$v: PRESENTE (${#val} caratteri)"; else echo "$v: ASSENTE"; fi
done
echo
echo "== e nel file .env se esiste =="
for f in /opt/withus-backend/.env /etc/withus-backend.env /opt/withus-backend/server/.env; do
  [ -f "$f" ] && { echo "--- $f"; sed -E 's/=.*/= <valore, '"$(echo)"'nascosto>/' "$f" | head -30; }
done
echo
echo "== la cartella dell'archivio cifrato =="
d=$(systemctl show withus-backend -p Environment 2>/dev/null | tr ' ' '\n' | grep '^ARCHIVIO_DIR=' | cut -d= -f2-)
echo "ARCHIVIO_DIR=${d:-(non impostata)}"
ls -la "${d:-/opt/withus-archivio}" 2>/dev/null | head -10
