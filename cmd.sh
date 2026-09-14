echo "== ora"; date '+%F %T'
echo "== stato login"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 10 "http://127.0.0.1:$2/loginstate" | head -c 200; echo; done
echo "== il sessionStorage è finito nella copia? (solo conteggio, mai il contenuto)"
python3 - <<'PY'
import json
try:
    d = json.load(open('/opt/withus-backend/scraper/axa/auth.json'))
    ss = d.get('sessionStorageWithus') or {}
    print('cookie salvati        :', len(d.get('cookies') or []))
    ls = sum(len(o.get('localStorage') or []) for o in (d.get('origins') or []))
    print('voci di localStorage  :', ls)
    print('voci di sessionStorage:', len(ss))
    if ss: print('chiavi (solo i nomi)  :', ', '.join(sorted(ss.keys()))[:300])
except Exception as e:
    print('non leggibile:', e)
PY
stat -c 'auth.json scritto: %y (%s byte)' /opt/withus-backend/scraper/axa/auth.json
echo "== giornale AXA dall'accesso"
journalctl -u axa-scraper --since '-20min' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | grep -aiE 'login|sessione|seme|2FA|Guardian' | tail -12
