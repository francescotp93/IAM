echo "== ora"; date '+%F %T %Z'
echo "== perche' il backend e' ripartito alle 19:12?"
journalctl -u withus-autopull --since "-20 min" --no-pager -o cat 2>/dev/null | tail -8
echo
echo "== LA POSTA: e' arrivata una mail di Groupama stasera?"
rm -rf /tmp/sonda && mkdir -p /tmp/sonda
ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/sonda.mjs <<'JS'
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
        const da = Math.max(1, tot - 24);
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
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
node /tmp/sonda/sonda.mjs 2>&1 | tail -35
rm -rf /tmp/sonda
