# Sopralluogo per l'archivio cifrato. SOLO LETTURA: niente chiavi, niente modifiche.
echo "== servizio =="
systemctl list-units --type=service --all 2>/dev/null | grep -iE "withus|backend" | head
echo
echo "== utente e cartella di lavoro del backend =="
systemctl show withus-backend -p User -p Group -p WorkingDirectory -p FragmentPath -p EnvironmentFiles 2>/dev/null
echo
echo "== override gia' presenti (nomi, non contenuti) =="
ls -la /etc/systemd/system/withus-backend.service.d/ 2>/dev/null || echo "(nessuna cartella di override)"
echo
echo "== la variabile e' gia' configurata? (solo si'/no) =="
if systemctl show withus-backend -p Environment 2>/dev/null | grep -q "ARCHIVIO_CHIAVE="; then echo "ARCHIVIO_CHIAVE: presente"; else echo "ARCHIVIO_CHIAVE: assente"; fi
echo
echo "== cartella dell'archivio =="
ls -ld /var/lib/withus /var/lib/withus/archivio 2>/dev/null || echo "(non esiste)"
echo
echo "== spazio sul disco =="
df -h /var/lib 2>/dev/null | tail -2
echo
echo "== commit del backend e diag =="
git -C /opt/withus-backend log --oneline -1 2>/dev/null
curl -s --max-time 8 http://127.0.0.1:3000/diag | head -c 300
