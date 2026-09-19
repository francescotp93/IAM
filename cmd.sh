echo "== ora"; date '+%F %T %Z'
echo "== 1. il NOSTRO sistema ha fatto qualcosa nell'ultima ora?"
journalctl --since "-60 min" --no-pager 2>/dev/null | grep -icE "schermata OTP raggiunta|richiesto nuovo OTP|rientro automatico|email inviata" | sed 's/^/righe su codici o invii: /'
echo -n "groupama: "; curl -s --max-time 6 http://127.0.0.1:4500/loginstate; echo
journalctl -u groupama-scraper --since "-60 min" --no-pager -o short 2>/dev/null | grep "\[groupama\]" | tail -5
echo
echo "== 2. e' arrivato un inoltro nelle caselle dell'agenzia? (ultimi 90 minuti)"
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/q.mjs <<'JS'
import { caselleDisponibili, conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
const LIMITE = Date.now() - 90 * 60 * 1000;
let trovate = 0;
for (const c of caselleDisponibili()) {
  try {
    await conImap(c, async (client) => {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const tot = client.mailbox ? client.mailbox.exists : 0;
        const da = Math.max(1, tot - 9);
        for await (const m of client.fetch(da + ':*', { source: true, internalDate: true })) {
          const q = m.internalDate ? new Date(m.internalDate).getTime() : 0;
          if (q < LIMITE) continue;
          const p = await simpleParser(m.source).catch(() => null);
          if (!p) continue;
          const mit = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '(?)';
          trovate++;
          console.log('  >>> ' + new Date(q).toISOString().replace('T',' ').slice(0,19) + '  in ' + c.split('@')[0]);
          console.log('      da:      ' + mit);
          console.log('      oggetto: ' + String(p.subject || '(senza oggetto)').slice(0, 120));
        }
      } finally { lock.release(); }
    });
  } catch (e) { console.log('  casella non leggibile: ' + String(e && e.message || e).slice(0,120)); }
}
if (!trovate) console.log('  nessun messaggio nelle ultime 90 minuti in nessuna delle tre caselle');
JS
node /tmp/sonda/q.mjs 2>&1 | tail -25
rm -rf /tmp/sonda
