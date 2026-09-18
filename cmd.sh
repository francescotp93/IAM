# Verifica che la chiave sia VALIDA, non solo presente. Niente valori in chiaro.
set -u
ENVF=/opt/withus-backend/server/.env
echo "== la chiave decodifica a 32 byte? (solo il conteggio) =="
awk -F'ARCHIVIO_CHIAVE=' '/^ARCHIVIO_CHIAVE=/{print $2}' "$ENVF" | tr -d '\r\n' | base64 -d 2>/dev/null | wc -c
echo "(atteso: 32)"
echo
echo "== il backend l'ha accettata? (se no, lo dice nel registro all'avvio) =="
journalctl -u withus-backend --since "-5 min" --no-pager 2>/dev/null | grep -i "archivio" | tail -5 || echo "(niente sull'archivio nel registro: nessun rifiuto)"
echo
echo "== prova vera: una richiesta senza sessione deve dire 401, non 503 =="
echo -n "apri senza sessione: "
curl -s -o /dev/null -w "%{http_code}\n" --max-time 8 http://127.0.0.1:3000/archivio/apri/11111111-1111-4111-8111-111111111111
echo "(401 = la rotta c'e' e la chiave e' a posto; 503 = chiave rifiutata)"
