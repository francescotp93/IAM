ENV=/opt/withus-backend/server/.env
SRC=/opt/withus-backend/index.html
echo "== prima =="
grep -q '^SUPABASE_ANON_KEY=' "$ENV" && echo "SUPABASE_ANON_KEY: gia' presente" || echo "SUPABASE_ANON_KEY: assente"
K=$(sed -nE "s/^const SUPABASE_KEY *= *'([^']+)'.*/\1/p" "$SRC" | head -1)
if [ -z "$K" ]; then echo "NON TROVATA nel client: non tocco niente"; exit 1; fi
echo "chiave pubblica letta dal client: ${#K} caratteri"
if ! grep -q '^SUPABASE_ANON_KEY=' "$ENV"; then
  cp -a "$ENV" "${ENV}.bak-$(date +%Y%m%d%H%M%S)"
  printf '\n# 21/09/2026 — la chiave ANONIMA (pubblica, la stessa del client): serve al\n# modulo archivio per scrivere i metadati con il token di chi carica.\nSUPABASE_ANON_KEY=%s\n' "$K" >> "$ENV"
  echo "scritta nel .env (backup accanto)"
else
  echo "non riscritta"
fi
systemctl restart withus-backend && sleep 4
pid=$(systemctl show withus-backend -p MainPID --value)
echo "== dopo: il processo la vede? =="
tr '\0' '\n' < "/proc/$pid/environ" | awk -F= '$1=="SUPABASE_ANON_KEY"{n=$1;v=substr($0,length(n)+2);printf "SUPABASE_ANON_KEY : %d caratteri\n", length(v)}'
systemctl is-active withus-backend
journalctl -u withus-backend -n 30 --no-pager | grep -i "archivio\|listen\|error" | tail -5
