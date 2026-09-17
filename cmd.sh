echo "== ora"; date '+%F %T %Z'
echo
echo "== CONTROPROVA VERA sulla password nel diario (finestra che funziona)"
echo -n "righe totali nelle ultime 13 ore: "
journalctl --since "-13 hours" --no-pager 2>/dev/null | wc -l
echo -n "  di cui con 'password: ':        "
journalctl --since "-13 hours" --no-pager 2>/dev/null | grep -c "password: "
echo "  messaggi di avvio VNC nelle ultime 13 ore:"
journalctl --since "-13 hours" --no-pager 2>/dev/null | grep "VNC" | sed -E 's/.*(VNC[^—]*).*/    \1/' | sort -u | head
echo
echo "== LA POSTA: e' mai arrivata una mail di Groupama stasera?"
cat > /tmp/sonda-posta.mjs <<'JS'
import { caselleDisponibili, conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const GROUPAMA = /(^|[.@])groupama\.(it|com)$/i;
const caselle = caselleDisponibili();
console.log('caselle configurate: ' + caselle.length);
for (const c of caselle) {
  try {
    await conImap(c, async (client) => {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const tot = client.mailbox ? client.mailbox.exists : 0;
        console.log('  INBOX: ' + tot + ' messaggi in tutto');
        const da = Math.max(1, tot - 19);
        const righe = [];
        for await (const m of client.fetch(da + ':*', { source: true, internalDate: true })) {
          const q = m.internalDate ? new Date(m.internalDate) : null;
          const p = await simpleParser(m.source).catch(() => null);
          const mit = p && p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
          const dom = mit.split('@')[1] || '';
          const gro = GROUPAMA.test(dom);
          righe.push('    ' + (q ? q.toISOString().slice(11,19) : '  ?  ') + '  ' + (gro ? '>>> GROUPAMA (' + dom + ')' : '(altro mittente)'));
        }
        console.log('  ultimi ' + righe.length + ' messaggi (solo ora e se e\' di Groupama):');
        for (const r of righe) console.log(r);
      } finally { lock.release(); }
    });
  } catch (e) { console.log('  casella non leggibile: ' + String(e && e.message || e).slice(0,140)); }
}
JS
cd /opt/withus-backend
set -a; . ./server/.env 2>/dev/null; set +a
node /tmp/sonda-posta.mjs 2>&1 | tail -35
rm -f /tmp/sonda-posta.mjs
