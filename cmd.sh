echo "== ora"; date '+%F %T %Z'
cd /opt/withus-backend
echo "== commit vivo"; git log --oneline -1
echo "== stato groupama"; curl -s --max-time 8 http://127.0.0.1:4500/loginstate; echo
echo
echo "== A. mail di Groupama nell'ultima ora, con l'orario"
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/q.mjs <<'JS'
import { conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const G = /(^|[.@])groupama\.(it|com)$/i;
const LIM = Date.now() - 60 * 60 * 1000;
const out = [];
await conImap('withus.coop@gmail.com', async (client) => {
  const lock = await client.getMailboxLock('INBOX');
  try {
    const tot = client.mailbox ? client.mailbox.exists : 0;
    for await (const m of client.fetch(Math.max(1, tot - 39) + ':*', { source: true, internalDate: true })) {
      const q = new Date(m.internalDate).getTime(); if (q < LIM) continue;
      const p = await simpleParser(m.source).catch(() => null); if (!p) continue;
      const a = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
      out.push({ t: q, g: G.test((a.split('@')[1] || '')), a });
    }
  } finally { lock.release(); }
});
out.sort((x,y)=>x.t-y.t);
const gr = out.filter(o=>o.g);
console.log('  mail di Groupama nell\'ultima ora: ' + gr.length);
for (const o of gr) console.log('    ' + new Date(o.t).toISOString().slice(11,19));
const altri = out.filter(o=>!o.g);
console.log('  altri messaggi nell\'ultima ora: ' + altri.length);
for (const o of altri) console.log('    ' + new Date(o.t).toISOString().slice(11,19) + '  da ' + (o.a.split('@')[1]||'?'));
JS
node /tmp/sonda/q.mjs 2>&1 | tail -30
rm -rf /tmp/sonda
echo
echo "== B. giornale groupama, ultima ora"
journalctl -u groupama-scraper --since "-60 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -20
echo
echo "== C. backend: vigilanza e posta, ultima ora"
journalctl -u withus-backend --since "-60 min" --no-pager -o cat 2>/dev/null | grep -iE "otp-posta|vigilanza-fonti] giro|groupama" | tail -15
