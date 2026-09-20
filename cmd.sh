echo "== ora"; date '+%F %T %Z'
echo "== scraper e backend"
for n in moto allianz italiana hdi groupama axa; do printf '%-10s %s\n' "$n" "$(systemctl is-active $n-scraper.service 2>/dev/null)"; done
printf '%-10s %s\n' "backend" "$(systemctl is-active withus-backend 2>/dev/null)"
echo "== stato di chi risponde"
for p in groupama:4500 axa:4700 allianz:4200 hdi:4400; do n=${p%%:*}; k=${p##*:}; printf '%-10s ' "$n"; curl -s --max-time 5 http://127.0.0.1:$k/loginstate | head -c 140; echo; done
echo
echo "== mail di Groupama nelle ultime 24 ore (deve essere 0)"
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/q.mjs <<'JS'
import { conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const G = /(^|[.@])groupama\.(it|com)$/i;
const LIM = Date.now() - 24 * 60 * 60 * 1000;
let n = 0;
await conImap('withus.coop@gmail.com', async (client) => {
  const lock = await client.getMailboxLock('INBOX');
  try {
    const tot = client.mailbox ? client.mailbox.exists : 0;
    for await (const m of client.fetch(Math.max(1, tot - 49) + ':*', { source: true, internalDate: true })) {
      const q = new Date(m.internalDate).getTime(); if (q < LIM) continue;
      const p = await simpleParser(m.source).catch(() => null); if (!p) continue;
      const a = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
      if (G.test((a.split('@')[1] || ''))) n++;
    }
  } finally { lock.release(); }
});
console.log('  mail di Groupama nelle ultime 24 ore: ' + n);
JS
node /tmp/sonda/q.mjs 2>&1 | tail -4
rm -rf /tmp/sonda
echo
echo "== commit vivo"; cd /opt/withus-backend && git log --oneline -1
