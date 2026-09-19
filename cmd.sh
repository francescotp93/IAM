echo "== ora"; date '+%F %T %Z'
echo "== A. quando e' ripartito lo scraper groupama (ultime 48 ore)"
journalctl -u groupama-scraper --since "-48 hours" --no-pager -o short-iso 2>/dev/null | grep -E "telecomando HTTP su" | sed -E 's/^([0-9-]+T[0-9:]+).*/  \1  AVVIO/' | tail -25
echo
echo "== B. quando sono arrivate le mail di Groupama"
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/c.mjs <<'JS'
import { conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const G = /(^|[.@])groupama\.(it|com)$/i;
const righe = [];
await conImap('withus.coop@gmail.com', async (client) => {
  const lock = await client.getMailboxLock('INBOX');
  try {
    const tot = client.mailbox ? client.mailbox.exists : 0;
    const da = Math.max(1, tot - 59);
    for await (const m of client.fetch(da + ':*', { source: true, internalDate: true })) {
      const p = await simpleParser(m.source).catch(() => null);
      if (!p) continue;
      const a = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
      if (!G.test((a.split('@')[1] || ''))) continue;
      righe.push(new Date(m.internalDate).toISOString().slice(0,19));
    }
  } finally { lock.release(); }
});
righe.sort();
console.log('  mail di Groupama trovate negli ultimi 60 messaggi: ' + righe.length);
for (const r of righe) console.log('  ' + r + '  MAIL');
JS
node /tmp/sonda/c.mjs 2>&1 | tail -45
rm -rf /tmp/sonda
