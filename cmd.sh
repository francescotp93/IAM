echo "== ora"; date '+%F %T %Z'
rm -rf /tmp/sonda && mkdir -p /tmp/sonda
ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/sonda.mjs <<'JS'
import { caselleDisponibili, conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const caselle = caselleDisponibili();
console.log('caselle configurate: ' + caselle.length);
for (const c of caselle) {
  const dom = (String(c).split('@')[1] || '').toLowerCase();
  console.log('--- casella @' + dom + ' ---');
  try {
    await conImap(c, async (client) => {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const tot = client.mailbox ? client.mailbox.exists : 0;
        const da = Math.max(1, tot - 19);
        const out = [];
        for await (const m of client.fetch(da + ':*', { source: true, internalDate: true })) {
          const q = m.internalDate ? new Date(m.internalDate) : null;
          const p = await simpleParser(m.source).catch(() => null);
          const a = p && p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
          const d = (a.split('@')[1] || '(sconosciuto)').toLowerCase();
          out.push({ t: q ? q.getTime() : 0, riga: '  ' + (q ? q.toISOString().replace('T',' ').slice(0,19) : '        ?        ') + '  @' + d });
        }
        out.sort((x,y) => y.t - x.t);
        console.log('  ultimi ' + out.length + ' messaggi, dal piu\' recente (ora UTC, solo il dominio di chi scrive):');
        for (const o of out) console.log(o.riga);
      } finally { lock.release(); }
    });
  } catch (e) { console.log('  casella non leggibile: ' + String(e && e.message || e).slice(0,140)); }
}
JS
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
node /tmp/sonda/sonda.mjs 2>&1 | tail -55
rm -rf /tmp/sonda
