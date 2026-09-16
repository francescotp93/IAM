#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Il repository si chiama IAM (16/09/2026): i remoti sul VPS seguono il nome.
#
# Fino al 16/09/2026 il repository era francescotp93/QUOTE. GitHub rimanda da
# solo dal nome vecchio al nuovo, quindi niente si e' rotto: ma il rimando dura
# finche' nessuno crea un altro repository chiamato QUOTE, e un impianto che
# funziona per gentilezza di un redirect non e' un impianto. Questo script,
# una volta sola:
#   1. controlla che il nome nuovo risponda davvero (git ls-remote) PRIMA di
#      toccare qualunque cosa: se GitHub non risponde, si ritenta al giro dopo;
#   2. sposta origin dei due cloni (/opt/withus-backend, il deploy; /opt/withus-cmd,
#      il canale comandi) sul nome nuovo, e verifica con un fetch;
#   3. toglie dal disco /opt/withus-iam, il secondo clone di Agente-sospesi che
#      dal 16/09 non serve piu' (IAM e' la cartella iam/ di questo repository):
#      solo se la configurazione Caddy in esecuzione non lo nomina e se il clone
#      non ha modifiche locali non salvate. Altrimenti lo lascia e lo dice.
#
# Idempotente: rilanciato, trova i remoti gia' giusti e la cartella gia' via.
# Log: /var/lib/withus-autopull/30-rinomina-repo-iam.sh.log
# ─────────────────────────────────────────────────────────────────────────────
set -u

NUOVO=https://github.com/francescotp93/IAM.git
VECCHIO=/opt/withus-iam
CLONI="/opt/withus-backend /opt/withus-cmd"

log() { echo "[$(date '+%F %T')] $*"; }

# 1. il nome nuovo deve rispondere, altrimenti non si tocca niente
if ! git ls-remote --exit-code --heads "$NUOVO" main >/dev/null 2>&1; then
  log "$NUOVO non risponde (rete o rinomina non ancora fatta): riprovero'"
  exit 1
fi
log "il repository IAM risponde su GitHub"

# 2. i remoti dei cloni
for d in $CLONI; do
  [ -d "$d/.git" ] || { log "$d non e' un clone: salto"; continue; }
  git config --global --add safe.directory "$d" >/dev/null 2>&1 || true
  ATTUALE=$(git -C "$d" remote get-url origin 2>/dev/null)
  case "$ATTUALE" in
    *"@github.com/"*) # con token dentro (il canale comandi): tengo il token, cambio solo il percorso
      DEST=$(printf '%s' "$ATTUALE" | sed 's|github.com/francescotp93/QUOTE\(\.git\)\?$|github.com/francescotp93/IAM.git|') ;;
    *) DEST=$NUOVO ;;
  esac
  if [ "$ATTUALE" = "$DEST" ]; then
    log "$d: origin gia' sul nome nuovo"
  else
    git -C "$d" remote set-url origin "$DEST" || { log "$d: set-url fallito"; exit 1; }
    log "$d: origin -> $(printf '%s' "$DEST" | sed 's|//[^@]*@|//***@|')"
  fi
  git -C "$d" fetch origin --quiet 2>/dev/null || { log "$d: fetch dal nome nuovo fallito"; exit 1; }
done

# 3. il secondo clone che non serve piu'
if [ -d "$VECCHIO" ]; then
  if curl -fsS http://127.0.0.1:2019/config/ 2>/dev/null | grep -q "$VECCHIO"; then
    log "ATTENZIONE: Caddy in esecuzione nomina ancora $VECCHIO: lo lascio"
    exit 1
  fi
  if [ -d "$VECCHIO/.git" ] && [ -n "$(git -C "$VECCHIO" status --porcelain 2>/dev/null)" ]; then
    log "ATTENZIONE: $VECCHIO ha modifiche locali non salvate: lo lascio, guardare a mano"
    exit 1
  fi
  rm -rf "$VECCHIO" && log "tolto $VECCHIO" || { log "rm di $VECCHIO fallito"; exit 1; }
else
  log "$VECCHIO non c'e' (gia' tolto)"
fi

log "fatto: i remoti seguono il nome IAM"
exit 0
