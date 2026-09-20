echo "== ora"; date '+%F %T %Z'
echo "== groupama e' acceso o spento?"
systemctl is-active groupama-scraper.service 2>&1
curl -s --max-time 6 http://127.0.0.1:4500/loginstate || echo "(porta muta)"; echo
echo "== quando e' stato fermato / riacceso"
journalctl -u groupama-scraper --since "-24 hours" --no-pager -o short-iso 2>/dev/null | grep -E "Started|Stopped" | sed -E 's/^([0-9-]+T[0-9:]+)[^ ]* .*(Started|Stopped).*/  \1  \2/' | tail -8
echo
echo "== LE MAIL DI GROUPAMA NELLE ULTIME 24 ORE"
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/q.mjs <<'JS'
import { conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const G = /(^|[.@])groupama\.(it|com)$/i;
const LIM = Date.now() - 24 * 60 * 60 * 1000;
const out = [];
await conImap('withus.coop@gmail.com', async (client) => {
  const lock = await client.getMailboxLock('INBOX');
  try {
    const tot = client.mailbox ? client.mailbox.exists : 0;
    for await (const m of client.fetch(Math.max(1, tot - 99) + ':*', { source: true, internalDate: true })) {
      const q = new Date(m.internalDate).getTime(); if (q < LIM) continue;
      const p = await simpleParser(m.source).catch(() => null); if (!p) continue;
      const a = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
      if (G.test((a.split('@')[1] || ''))) out.push(q);
    }
  } finally { lock.release(); }
});
out.sort((x,y)=>x-y);
const STOP = Date.parse('2026-09-19T16:16:51Z');
const prima = out.filter(t => t <= STOP), dopo = out.filter(t => t > STOP);
console.log('  totale nelle ultime 24 ore: ' + out.length);
console.log('  PRIMA che fermassi groupama (fino alle 16:16:51 del 19/09): ' + prima.length);
console.log('  DOPO, con groupama fermo: ' + dopo.length);
for (const t of dopo) console.log('    ' + new Date(t).toISOString().replace('T',' ').slice(0,19) + '   <<<');
JS
node /tmp/sonda/q.mjs 2>&1 | tail -30
rm -rf /tmp/sonda
