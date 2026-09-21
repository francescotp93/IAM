echo "== attendo l'autopull =="
for i in $(seq 1 18); do
  v=$(grep -o 'app-versione" content="[^"]*"' /opt/withus-backend/iam/index.html 2>/dev/null | head -1)
  case "$v" in *0.21.1*) echo "arrivata dopo ~$((i*10))s"; break;; esac
  sleep 10
done
git -C /opt/withus-backend rev-parse --short HEAD
grep -o 'app-versione[^>]*' /opt/withus-backend/iam/index.html | head -2
echo
echo "== il modulo archivio, dopo il riavvio col codice nuovo =="
systemctl restart withus-backend && sleep 4
systemctl is-active withus-backend
journalctl -u withus-backend --since "-1 min" --no-pager | grep -i "archivio cifrato spento" && echo "^^ SPENTO" || echo "acceso: il controllo di scrittura e' passato"
echo
echo "== la cartella, e nessun residuo della prova d'avvio =="
ls -la /var/lib/withus/archivio
echo "file cifrati: $(find /var/lib/withus/archivio -name '*.bin' 2>/dev/null | wc -l)"
