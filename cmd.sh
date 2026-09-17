echo "== ora"; date '+%F %T %Z'
echo
echo "== le 16 righe con la password: PRIMA o DOPO il riavvio delle 07:50?"
echo "   (stampo solo l'ora e quale scraper, NON la password)"
journalctl --since "-13 hours" --no-pager -o short-iso 2>/dev/null | grep "password: " \
  | sed -E 's/^([0-9-]+T[0-9:]+)[^ ]* .*VNC ([A-Za-z]*) .*/\1  \2/' | sort
echo
echo "== e dopo le 08:00? (deve essere vuoto)"
journalctl --since "-12 hours" --no-pager 2>/dev/null | grep -c "password: " | sed 's/^/righe con la password nelle ultime 12 ore: /'
echo
echo "== LA POSTA: e' arrivata una mail di Groupama stasera?"
cd /opt/withus-backend
cat > .sonda-posta.mjs <<'JS'
import { caselleDisponibili, conImap } from './server/mail.js';
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
          const dom = (mit.split('@')[1] || '').toLowerCase();
          righe.push('    ' + (q ? q.toISOString().slice(11,19) : '  ?  ') + '  ' + (GROUPAMA.test(dom) ? '>>> GROUPAMA <<<' : '(altro mittente)'));
        }
        console.log('  ultimi ' + righe.length + ' messaggi, ora UTC e se sono di Groupama:');
        for (const r of righe) console.log(r);
      } finally { lock.release(); }
    });
  } catch (e) { console.log('  casella non leggibile: ' + String(e && e.message || e).slice(0,140)); }
}
JS
set -a; . ./server/.env 2>/dev/null; set +a
node .sonda-posta.mjs 2>&1 | tail -32
rm -f .sonda-posta.mjs
