echo "== con che utente gira il backend =="
systemctl show withus-backend -p User -p Group -p MainPID
pid=$(systemctl show withus-backend -p MainPID --value); ps -o user= -p "$pid" 2>/dev/null
echo
echo "== la cartella dell'archivio =="
D=$(tr '\0' '\n' < "/proc/$pid/environ" | sed -nE 's/^ARCHIVIO_DIR=(.*)/\1/p')
echo "ARCHIVIO_DIR=$D"
ls -ld /var /var/lib /var/lib/withus "$D" 2>&1
echo
echo "== che cosa c'e' dentro =="
find "$D" -maxdepth 3 2>/dev/null | head -20
echo "file cifrati presenti: $(find "$D" -name '*.bin' 2>/dev/null | wc -l)"
echo
echo "== prova di scrittura CON L'UTENTE DEL SERVIZIO =="
U=$(ps -o user= -p "$pid" 2>/dev/null | tr -d ' ')
sudo -u "$U" mkdir -p "$D/zz/test" 2>&1 && echo "mkdir: riuscito" || echo "mkdir: NEGATO"
sudo -u "$U" touch "$D/zz/test/prova.bin" 2>&1 && echo "scrittura: riuscita" || echo "scrittura: NEGATA"
rm -rf "$D/zz" 2>/dev/null
echo
echo "== errori dell'archivio negli ultimi 20 minuti =="
journalctl -u withus-backend --since "-20 min" --no-pager 2>/dev/null | grep -i "archivio" | tail -6
