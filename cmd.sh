echo "== ora"; date '+%F %T %Z'
sleep 150
cd /opt/withus-backend
echo "== commit vivo"; git log --oneline -1
echo "== stato groupama"; curl -s --max-time 8 http://127.0.0.1:4500/loginstate; echo
echo "== giornale groupama, ultimi 10 minuti"
journalctl -u groupama-scraper --since "-10 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -10
echo
echo "== mail di Groupama negli ultimi 15 minuti"
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/q.mjs <<'JS'
import { conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const G = /(^|[.@])groupama\.(it|com)$/i;
const LIM = Date.now() - 15 * 60 * 1000;
const out = [];
await conImap('withus.coop@gmail.com', async (client) => {
  const lock = await client.getMailboxLock('INBOX');
  try {
    const tot = client.mailbox ? client.mailbox.exists : 0;
    for await (const m of client.fetch(Math.max(1, tot - 19) + ':*', { source: true, internalDate: true })) {
      const q = new Date(m.internalDate).getTime(); if (q < LIM) continue;
      const p = await simpleParser(m.source).catch(() => null); if (!p) continue;
      const a = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
      if (G.test((a.split('@')[1] || ''))) out.push(new Date(q).toISOString().slice(11,19));
    }
  } finally { lock.release(); }
});
out.sort();
console.log('  mail di Groupama negli ultimi 15 minuti: ' + out.length);
for (const t of out) console.log('    ' + t);
JS
node /tmp/sonda/q.mjs 2>&1 | tail -12
rm -rf /tmp/sonda
