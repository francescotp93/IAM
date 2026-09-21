echo "== attendo l'autopull (fino a 3 minuti) =="
for i in $(seq 1 18); do
  v=$(grep -o 'app-versione" content="[^"]*"' /opt/withus-backend/iam/index.html 2>/dev/null | head -1)
  case "$v" in *0.21.0*) echo "arrivata dopo ~$((i*10))s"; break;; esac
  sleep 10
done
echo
echo "== commit vivo sul VPS =="
git -C /opt/withus-backend rev-parse --short HEAD
echo
echo "== versione nei due documenti =="
grep -o 'app-versione[^>]*' /opt/withus-backend/iam/index.html | head -2
grep -o 'app-versione[^>]*' /opt/withus-backend/index.html | head -2
echo
echo "== il backend ha la chiave e risponde =="
pid=$(systemctl show withus-backend -p MainPID --value)
tr '\0' '\n' < "/proc/$pid/environ" | awk -F= '$1=="SUPABASE_ANON_KEY"{n=$1;v=substr($0,length(n)+2);printf "SUPABASE_ANON_KEY presente: %d caratteri\n", length(v)}'
systemctl is-active withus-backend
echo
echo "== IAM dal vivo =="
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://iam.withusassicurazioni.it/
curl -s https://iam.withusassicurazioni.it/ | grep -o 'app-versione[^>]*' | head -2
echo
echo "== errori dell'archivio negli ultimi minuti =="
journalctl -u withus-backend --since "-10 min" --no-pager 2>/dev/null | grep -i "archivio" | tail -5 || echo "(nessuno)"
