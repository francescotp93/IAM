echo "== ora"; date '+%F %T'
echo "== COOKIE SALVATI SU DISCO — domini, nomi e scadenze. MAI i valori."
python3 - <<'PY'
import json, time, collections
d = json.load(open('/opt/withus-backend/scraper/axa/auth.json'))
ck = d.get('cookies') or []
print('totale cookie:', len(ck))
print()
print('per dominio:')
for dom, n in sorted(collections.Counter(c.get('domain','?') for c in ck).items(), key=lambda x: -x[1]):
    sess = sum(1 for c in ck if c.get('domain')==dom and (c.get('expires') in (-1, None) or c.get('expires',0) <= 0))
    print('  %-34s %3d cookie   (%d di sola sessione)' % (dom, n, sess))
print()
print('cookie che SCADONO CON IL BROWSER (expires <= 0) — sono quelli che non sopravvivono da soli:')
for c in ck:
    if c.get('expires') in (-1, None) or c.get('expires', 0) <= 0:
        print('  %-30s %-34s httpOnly=%s secure=%s sameSite=%s' % (
            c.get('name','?')[:30], c.get('domain','?'), c.get('httpOnly'), c.get('secure'), c.get('sameSite')))
print()
print('i piu\' longevi (primi 8), solo nome e dominio:')
vivi = sorted([c for c in ck if (c.get('expires') or 0) > 0], key=lambda c: -(c.get('expires') or 0))[:8]
for c in vivi:
    print('  %-30s %-34s scade %s' % (c.get('name','?')[:30], c.get('domain','?'), time.strftime('%F', time.localtime(c['expires']))))
print()
print('origini con localStorage (solo conteggio):')
for o in (d.get('origins') or []):
    print('  %-45s %d voci' % (o.get('origin','?'), len(o.get('localStorage') or [])))
PY
