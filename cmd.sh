echo "== ora"; date '+%F %T %Z'
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/s.mjs <<'JS'
import { conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const G = /(^|[.@])groupama\.(it|com)$/i;
const DEPLOY = Date.parse('2026-09-19T12:05:41Z');
const righe = [];
await conImap('withus.coop@gmail.com', async (client) => {
  const lock = await client.getMailboxLock('INBOX');
  try {
    const tot = client.mailbox ? client.mailbox.exists : 0;
    for await (const m of client.fetch(Math.max(1, tot - 29) + ':*', { source: true, internalDate: true })) {
      const p = await simpleParser(m.source).catch(() => null); if (!p) continue;
      const a = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
      if (!G.test((a.split('@')[1] || ''))) continue;
      righe.push(new Date(m.internalDate).getTime());
    }
  } finally { lock.release(); }
});
righe.sort((a,b)=>a-b);
const dopo = righe.filter(t => t > DEPLOY);
const prima = righe.filter(t => t <= DEPLOY);
console.log('  ultime mail di Groupama PRIMA della correzione (12:05:41):');
for (const t of prima.slice(-6)) console.log('    ' + new Date(t).toISOString().slice(11,19));
console.log('');
console.log('  mail di Groupama DOPO la correzione: ' + dopo.length);
for (const t of dopo) console.log('    ' + new Date(t).toISOString().slice(11,19) + '   <<<');
console.log('');
console.log('  adesso sono le ' + new Date().toISOString().slice(11,19) + ' UTC');
JS
node /tmp/sonda/s.mjs 2>&1 | tail -25
rm -rf /tmp/sonda
