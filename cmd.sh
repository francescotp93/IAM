# ─────────────────────────────────────────────────────────────────────────────
#  ARCHIVIO CIFRATO — configurazione. LA CHIAVE NON VIENE MAI STAMPATA.
#  L'output di questo comando finisce su un ramo del repository: qualunque cosa
#  scritta qui dentro resta nella storia di git per sempre. Per questo si
#  stampano solo esiti (si'/no), mai il valore della chiave.
#  Idempotente: se la chiave c'e' gia', NON si rigenera — rigenerarla renderebbe
#  illeggibili i documenti gia' cifrati.
# ─────────────────────────────────────────────────────────────────────────────
set -u
ENVF=/opt/withus-backend/server/.env
DIR=/var/lib/withus/archivio

echo "== 1. chiave =="
if grep -q '^ARCHIVIO_CHIAVE=' "$ENVF" 2>/dev/null; then
  echo "gia' configurata: NON la tocco (rigenerarla renderebbe illeggibile quello che c'e')"
else
  umask 077
  printf '\n# Archivio documenti cifrato sul VPS (18/09/2026) — vedi deploy/ARCHIVIO-CIFRATO.md\n' >> "$ENVF"
  printf 'ARCHIVIO_CHIAVE=%s\n' "$(openssl rand -base64 32)" >> "$ENVF"
  printf 'ARCHIVIO_DIR=%s\n' "$DIR" >> "$ENVF"
  echo "generata e scritta in server/.env (non stampata)"
fi
grep -q '^ARCHIVIO_DIR=' "$ENVF" 2>/dev/null || printf 'ARCHIVIO_DIR=%s\n' "$DIR" >> "$ENVF"
chown withus "$ENVF" 2>/dev/null; chmod 600 "$ENVF" 2>/dev/null
echo "permessi di .env: $(stat -c '%a %U' "$ENVF" 2>/dev/null)"
echo "la chiave e' lunga 44 caratteri? $(awk -F= '/^ARCHIVIO_CHIAVE=/{print (length($2)==44) ? "si" : "NO ("length($2)")"}' "$ENVF")"

echo
echo "== 2. cartella dell'archivio =="
mkdir -p "$DIR" && chown -R withus "$DIR" && chmod 700 "$DIR"
echo "$(stat -c '%a %U %n' "$DIR" 2>/dev/null)"
case "$DIR" in /opt/withus-backend*) echo "ATTENZIONE: sta dentro la radice servita dal sito!";; *) echo "fuori dalla radice servita dal sito: ok";; esac

echo
echo "== 3. riavvio =="
systemctl restart withus-backend && sleep 3 && systemctl is-active withus-backend

echo
echo "== 4. esito =="
curl -s --max-time 8 http://127.0.0.1:3000/diag | grep -o '"archivio":[a-z]*'
echo "la chiave NON compare in questo output, ed e' voluto."
echo "per la copia offline, da leggere TU sul server:  sudo grep ARCHIVIO_CHIAVE $ENVF"
