D=/var/lib/withus
echo "== prima =="
ls -ld "$D" "$D/archivio"
echo
echo "== correzione: il proprietario giusto sul ramo e sulla foglia =="
chown withus:withus "$D" "$D/archivio"
chmod 700 "$D" "$D/archivio"
ls -ld "$D" "$D/archivio"
echo
echo "== prova di scrittura con l'utente del servizio =="
sudo -u withus mkdir -p "$D/archivio/zz/test" && echo "mkdir: riuscito" || echo "mkdir: NEGATO"
sudo -u withus sh -c 'printf x > '"$D"'/archivio/zz/test/prova.bin' && echo "scrittura: riuscita" || echo "scrittura: NEGATA"
rm -rf "$D/archivio/zz"
echo
echo "== riavvio e controllo d'avvio =="
systemctl restart withus-backend && sleep 4
systemctl is-active withus-backend
journalctl -u withus-backend --since "-1 min" --no-pager | grep -i "archivio cifrato spento" && echo "^^ il modulo e' SPENTO" || echo "nessun avviso di spegnimento: il modulo e' acceso"
echo
echo "== file cifrati presenti =="
find "$D/archivio" -name '*.bin' 2>/dev/null | wc -l
