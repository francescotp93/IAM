echo "== ora"; date '+%F %T'
echo "== AXA adesso"; curl -s -m 10 http://127.0.0.1:4700/status | head -c 220; echo
echo "== la copia su disco, dopo il login delle 13:17"
python3 - <<'PY'
import json, os, time
p='/opt/withus-backend/scraper/axa/auth.json'
d=json.load(open(p)); ss=d.get('sessionStorageWithus') or {}
print('scritto il          :', time.strftime('%F %T', time.localtime(os.path.getmtime(p))))
print('cookie              :', len(d.get('cookies') or []))
print('voci localStorage   :', sum(len(o.get('localStorage') or []) for o in (d.get('origins') or [])))
print('voci sessionStorage :', len(ss))
if ss: print('chiavi (solo nomi)  :', ', '.join(sorted(ss.keys()))[:400])
PY
echo "== giornale AXA dalle 13:15"
journalctl -u axa-scraper --since '13:15' --no-pager 2>/dev/null | sed 's/.*start-service.sh\[[0-9]*\]: //' | tail -14
