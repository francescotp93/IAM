echo "== ora"; date '+%F %T'
echo "== le fonti registrate: SOLO id, indirizzo del servizio e se è attiva"
python3 - <<'PY'
import json
d = json.load(open('/opt/withus-backend/server/fonti.store.json'))
def riga(id_, s):
    if not isinstance(s, dict): return
    print('  %-14s surl=%-28s attiva=%s  ha_credenziali=%s' % (
        id_, s.get('surl') or '(nessuno)', s.get('attiva'),
        'sì' if (s.get('password') or s.get('pwd')) else 'no'))
print('PREDEFINITE:')
for k, v in d.items():
    if k != '__custom': riga(k, v)
print('PERSONALIZZATE (__custom):')
for k, v in (d.get('__custom') or {}).items(): riga(k, v)
PY
echo
echo "== il quotatore è dirottato da una variabile d'ambiente?"
systemctl show withus-backend -p Environment 2>/dev/null | tr ' ' '\n' | grep -iE 'SCRAPER_URL|AXA' || echo "(nessuna variabile *_SCRAPER_URL nel servizio)"
grep -riE 'AXA_SCRAPER_URL' /etc/systemd/system/withus-backend.service /opt/withus-backend/.env 2>/dev/null | sed 's/=.*/=<valore nascosto>/' || echo "(niente nemmeno nei file del servizio)"
echo
echo "== chi risponde sulle porte degli scraper"
for p in 4700 4500 4400 4300 4200 4100 4600 4800 4900 5000; do printf "  %s -> " "$p"; curl -s -m 3 "http://127.0.0.1:$p/loginstate" | head -c 90; echo; done
